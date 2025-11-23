
import { GAME_CONFIG, GRID_SIZE } from '../constants';
import { Tile as TileType } from '../types';
import { calculateEnemyLevel } from './gameplay';

/**
 * A tile allows vision to pass through if it is revealed AND is transparent.
 * Transparent tiles: Track, Train, Void, or Cleared (Empty).
 * Uncleared obstacles (Tree, Rock, Enemy) block vision.
 */
const isLightSource = (tile: TileType | undefined): boolean => {
  if (!tile || !tile.revealed) return false;
  // Void, Track, Train are always transparent. 
  // Other types are only transparent if cleared (which usually converts them to 'empty', but checking cleared is safer)
  return tile.type === 'void' || tile.type === 'track' || tile.type === 'train' || tile.type === 'search' || tile.cleared;
};

/**
 * Updates the 'peeked' status of tiles. 
 * A tile is 'peeked' if it is NOT revealed but is adjacent to a LightSource.
 */
export const updatePeekStatus = (grid: TileType[]) => {
  // Optimize by creating a set of light source coordinates for O(1) lookup
  const lightSources = new Set<string>();
  grid.forEach(t => {
    if (isLightSource(t)) {
      lightSources.add(`${t.x},${t.y}`);
    }
  });

  const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

  grid.forEach(tile => {
    // If already revealed, it's not peeked.
    if (tile.revealed) {
      tile.peeked = false;
      return;
    }

    // Check if any neighbor is a light source
    let isAdjacentToLight = false;
    for (const { dx, dy } of neighbors) {
      // Check coordinate existence in the set
      if (lightSources.has(`${tile.x + dx},${tile.y + dy}`)) {
        isAdjacentToLight = true;
        break;
      }
    }

    tile.peeked = isAdjacentToLight;
  });
};

/**
 * Reveals neighbors of a specific tile (cx, cy).
 * This should typically only be called when the center tile is a LightSource (e.g. just moved to, or just cleared).
 */
export const revealNeighbors = (cx: number, cy: number, currentGrid: TileType[]) => {
  const neighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  const newlyRevealed: TileType[] = [];

  neighbors.forEach(({ dx, dy }) => {
    const targetX = cx + dx;
    const targetY = cy + dy;

    if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
      const targetTile = currentGrid.find(t => t.x === targetX && t.y === targetY);
      if (targetTile && !targetTile.revealed) {
        targetTile.revealed = true;
        newlyRevealed.push(targetTile);
      }
    }
  });

  // After revealing new tiles, update the peek status for the rest of the grid
  updatePeekStatus(currentGrid);

  return newlyRevealed;
};

export const generateLevel = (station: number, san: number = 0): TileType[] => {
  const newGrid: TileType[] = [];
  const centerX = 3;
  const centerY = 3;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      let type: any = 'search';
      let revealed = false;
      let cleared = false;
      let scavengeLeft = 0;
      let attack = 0;
      let hp = 0;

      const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
      const isSafeZone = (y >= centerY - GAME_CONFIG.MAP.SAFE_ZONE_OFFSET && y <= centerY + GAME_CONFIG.MAP.SAFE_ZONE_OFFSET);

      if (y === centerY) {
        if (x === centerX) {
          type = 'train';
          revealed = true;
          cleared = true;
        } else {
          type = 'track';
          revealed = true;
          cleared = true;
        }
      } else {
        let voidChance = 0;
        if (!isSafeZone) {
          voidChance = Math.max(0, (dist - GAME_CONFIG.MAP.VOID.DIST_THRESHOLD) * GAME_CONFIG.MAP.VOID.CHANCE_MULT);
        }

        if (Math.random() < voidChance) {
          type = 'void';
        } else {
          const rand = Math.random();
          const probs = isSafeZone ? GAME_CONFIG.MAP.PROBS.SAFE : GAME_CONFIG.MAP.PROBS.DANGER;

          if (rand < probs.TREE) {
            type = 'tree';
            scavengeLeft = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
          } else if (rand < probs.ROCK) {
            type = 'rock';
          } else if (rand < (probs.ENEMY_BASE + (station * probs.ENEMY_SCALE))) {
            type = 'enemy';
            const level = calculateEnemyLevel(station, san);
            attack = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.ATTACK_VAR) +
              GAME_CONFIG.MAP.ENEMIES.ATTACK_MIN +
              level;
            hp = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.HP_VAR) +
              GAME_CONFIG.MAP.ENEMIES.HP_MIN +
              (level * 2);
          } else {
            scavengeLeft = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.SCAVENGE_VAR) + GAME_CONFIG.MAP.LOOT.SCAVENGE_MIN;
          }
        }
      }

      newGrid.push({
        x, y, type, revealed, cleared, scavengeLeft, attack,
        hp: type === 'enemy' ? hp : undefined,
        maxHp: type === 'enemy' ? hp : undefined,
        effect: null,
        id: `${x}-${y}`,
        peeked: false
      });
    }
  }

  // --- FORCE SAFE START ---
  // The tiles immediately adjacent to the train perpendicular to the track must be accessible
  const startAccessible = [
    { x: centerX, y: centerY - 1 },
    { x: centerX, y: centerY + 1 },
  ];

  startAccessible.forEach(pos => {
    const tile = newGrid.find(t => t.x === pos.x && t.y === pos.y);
    if (tile) {
      tile.type = 'search';
      tile.scavengeLeft = Math.floor(Math.random() * 2) + 2;
      tile.cleared = true; // It's open ground
      tile.revealed = true; // And we can see it
    }
  });

  // --- FORCE EXACTLY 1 NPC PER SECTOR ---
  // Find all non-void, non-track, non-train search tiles that could become NPCs
  // Must be at least MIN_DISTANCE_FROM_TRAIN away from the train (using Manhattan distance: sum of x and y)
  const minDistance = GAME_CONFIG.MAP.NPC.MIN_DISTANCE_FROM_TRAIN;
  const potentialNPCTiles = newGrid.filter(t => {
    if (t.type !== 'search' || t.revealed || t.y === centerY) {
      return false;
    }

    // Calculate distance from train (Manhattan distance: sum of x and y offsets)
    const xDist = Math.abs(t.x - centerX);
    const yDist = Math.abs(t.y - centerY);
    const manhattanDistance = xDist + yDist;

    return manhattanDistance >= minDistance;
  });

  if (potentialNPCTiles.length > 0) {
    // Pick a random tile to become an NPC
    const npcTile = potentialNPCTiles[Math.floor(Math.random() * potentialNPCTiles.length)];

    // Convert to NPC
    npcTile.type = 'npc';

    // Assign random buff
    const buffs: ('stamina' | 'health' | 'attack')[] = ['stamina', 'health', 'attack'];
    npcTile.npcBuff = buffs[Math.floor(Math.random() * buffs.length)];

    // Assign rescue turns
    const rescueTurns = Math.floor(Math.random() * GAME_CONFIG.MAP.NPC.RESCUE_TURNS_VAR) + GAME_CONFIG.MAP.NPC.RESCUE_TURNS_MIN;
    npcTile.rescueProgress = rescueTurns;
    npcTile.maxRescueProgress = rescueTurns;
  }

  // Run initial reveal logic
  // 1. Reveal neighbors of the Train (Center)
  revealNeighbors(centerX, centerY, newGrid);

  // 2. Reveal neighbors of the forced open tiles.
  // This ensures we see the first layer of trees/rocks around our starting clearing.
  // startAccessible.forEach(pos => {
  //     revealNeighbors(pos.x, pos.y, newGrid);
  // });

  // --- BROKEN TRACKS ---
  const trackTiles = newGrid.filter(t => t.type === 'track');
  const brokenCount = Math.min(trackTiles.length, GAME_CONFIG.MAP.BROKEN_TRACKS.BASE + (station) * GAME_CONFIG.MAP.BROKEN_TRACKS.PER_SECTOR);

  // Shuffle tracks to pick random ones
  for (let i = trackTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trackTiles[i], trackTiles[j]] = [trackTiles[j], trackTiles[i]];
  }

  // Mark first N as broken
  for (let i = 0; i < brokenCount; i++) {
    trackTiles[i].isBroken = true;
  }

  // Final pass to set peek status correctly based on the initial reveals
  updatePeekStatus(newGrid);

  return newGrid;
};
