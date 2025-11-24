
import { GAME_CONFIG, GRID_SIZE } from '../constants';
import { Tile as TileType } from '../types';
import { calculateEnemyLevel } from './gameplay';

/**
 * A tile allows vision to pass through if it is revealed AND is transparent.
 * Transparent tiles: Track, Train, Void, or Cleared (Empty).
 * Uncleared obstacles (Tree, Rock, Enemy) block vision.
 */
const isLightSource = (tile: TileType | undefined): boolean => {
  // if (!tile || !tile.revealed) return false;
  // Void, Track, Train are always transparent. 
  // Other types are only transparent if cleared (which usually converts them to 'empty', but checking cleared is safer)
  return tile.type === 'train' || tile.type === 'locomotive' || tile.type === 'workshop_carriage' || tile.type === 'cargo_carriage' || tile.cleared || tile.revealed;
  // return tile.type === 'void' || tile.type === 'train' || tile.type === 'search' || tile.cleared;
  // return tile.type === 'void' || tile.type === 'track' || tile.type === 'train' || tile.type === 'search' || tile.cleared;
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
  // We no longer reveal neighbors directly. We just update the peek status.
  // Neighbors of a light source become 'peeked' (explorable), not 'revealed'.
  updatePeekStatus(currentGrid);
  return [];
};

export const generateLevel = (station: number, san: number = 0): TileType[] => {
  const newGrid: TileType[] = [];
  const centerX = 3;
  const centerY = 3;

  // 1. Initialize Grid with Void/Track/Train/Search(Placeholder)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      let type: any = 'search';
      let revealed = false;
      let cleared = false;

      const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
      const isSafeZone = (y >= centerY - GAME_CONFIG.MAP.SAFE_ZONE_OFFSET && y <= centerY + GAME_CONFIG.MAP.SAFE_ZONE_OFFSET);

      if (y === centerY) {
        if (x === centerX + 1) {
          type = 'locomotive';
          revealed = true;
          cleared = true;
        } else if (x === centerX) {
          type = 'workshop_carriage';
          revealed = true;
          cleared = true;
        } else if (x === centerX - 1) {
          type = 'cargo_carriage';
          revealed = true;
          cleared = true;
        } else {
          type = 'track';
          revealed = false;
          cleared = false;
        }
      } else {
        // Void Logic
        let voidChance = 0;
        if (!isSafeZone) {
          voidChance = Math.max(0, (dist - GAME_CONFIG.MAP.VOID.DIST_THRESHOLD) * GAME_CONFIG.MAP.VOID.CHANCE_MULT);
        }
        if (Math.random() < voidChance) {
          type = 'void';
        }
      }

      // Initialize tile with default/placeholder values
      const configKey = type.toUpperCase() as keyof typeof GAME_CONFIG.EXPLORATION.CLICKS_REQUIRED;
      const maxExploration = GAME_CONFIG.EXPLORATION.CLICKS_REQUIRED[configKey] ?? 1;

      newGrid.push({
        x, y, type, revealed, cleared,
        scavengeLeft: 0, attack: 0, hp: 0, maxHp: 0,
        effect: null,
        id: `${x}-${y}`,
        peeked: false,
        explorationProgress: 0,
        maxExploration
      });
    }
  }

  // 2. Identify Available Slots (Non-Fixed, Non-Void)
  // We exclude Train, Track, and Void.
  let availableTiles = newGrid.filter(t =>
    t.type !== 'train' &&
    t.type !== 'locomotive' &&
    t.type !== 'workshop_carriage' &&
    t.type !== 'cargo_carriage' &&
    t.type !== 'track' &&
    t.type !== 'void'
  );

  // 3. Handle Safe Start (Force specific tiles to be safe/search)
  // These are the tiles immediately adjacent to the train (up/down)
  const safeStartCoords = [
    { x: centerX, y: centerY - 1 },
    { x: centerX, y: centerY + 1 }
  ];

  const safeTiles: TileType[] = [];
  safeStartCoords.forEach(pos => {
    const tile = newGrid.find(t => t.x === pos.x && t.y === pos.y);
    if (tile && tile.type !== 'void') {
      tile.type = 'search';
      tile.scavengeLeft = Math.floor(Math.random() * 2) + 2;
      tile.cleared = false;
      tile.revealed = false;
      tile.peeked = true; // Explorable
      safeTiles.push(tile);
    }
  });

  // Remove safe tiles from the deck pool
  availableTiles = availableTiles.filter(t => !safeTiles.includes(t));

  // 4. Handle NPC
  // Must be at min distance
  const minDistance = GAME_CONFIG.MAP.NPC.MIN_DISTANCE_FROM_TRAIN;
  const minNPCs = GAME_CONFIG.MAP.DECK.MIN_NPCS;

  for (let i = 0; i < minNPCs; i++) {
    const npcCandidates = availableTiles.filter(t => {
      const dist = Math.abs(t.x - centerX) + Math.abs(t.y - centerY);
      return dist >= minDistance;
    });

    if (npcCandidates.length > 0) {
      const npcTile = npcCandidates[Math.floor(Math.random() * npcCandidates.length)];
      npcTile.type = 'npc';

      // Assign NPC props
      const buffs: ('stamina' | 'health' | 'attack')[] = ['stamina', 'health', 'attack'];
      npcTile.npcBuff = buffs[Math.floor(Math.random() * buffs.length)];
      const rescueTurns = Math.floor(Math.random() * GAME_CONFIG.MAP.NPC.RESCUE_TURNS_VAR) + GAME_CONFIG.MAP.NPC.RESCUE_TURNS_MIN;
      npcTile.rescueProgress = rescueTurns;
      npcTile.maxRescueProgress = rescueTurns;

      // Remove from available
      availableTiles = availableTiles.filter(t => t !== npcTile);
    }
  }

  // 5. Generate Deck
  const deckSize = availableTiles.length;
  const { TREE_PCT, ROCK_PCT, ENEMY_PCT, MIN_TREES, MIN_ROCKS, MIN_ENEMIES } = GAME_CONFIG.MAP.DECK;

  let treeCount = Math.floor(deckSize * TREE_PCT);
  if (treeCount < MIN_TREES) treeCount = MIN_TREES;

  let rockCount = Math.floor(deckSize * ROCK_PCT);
  if (rockCount < MIN_ROCKS) rockCount = MIN_ROCKS;

  let enemyCount = Math.floor(deckSize * ENEMY_PCT);
  if (enemyCount < MIN_ENEMIES) enemyCount = MIN_ENEMIES;

  const deck: string[] = [];
  for (let i = 0; i < treeCount; i++) deck.push('tree');
  for (let i = 0; i < rockCount; i++) deck.push('rock');
  for (let i = 0; i < enemyCount; i++) deck.push('enemy');

  // Fill remainder with 'search'
  while (deck.length < deckSize) {
    deck.push('search');
  }

  // If deck is too big (because minimums forced us over), trim to size
  if (deck.length > deckSize) {
    deck.length = deckSize;
  }

  // 6. Shuffle Deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // 7. Assign Deck to Tiles
  availableTiles.forEach((tile, index) => {
    const type = deck[index];
    tile.type = type as any;

    // Set properties based on type
    if (type === 'tree') {
      tile.scavengeLeft = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
    } else if (type === 'rock') {
      // Rocks don't have scavengeLeft usually
    } else if (type === 'enemy') {
      const level = calculateEnemyLevel(station, san);
      tile.attack = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.ATTACK_VAR) +
        GAME_CONFIG.MAP.ENEMIES.ATTACK_MIN +
        level;
      const hp = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.HP_VAR) +
        GAME_CONFIG.MAP.ENEMIES.HP_MIN +
        (level * 2);
      tile.hp = hp;
      tile.maxHp = hp;
    } else if (type === 'search') {
      tile.scavengeLeft = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.SCAVENGE_VAR) + GAME_CONFIG.MAP.LOOT.SCAVENGE_MIN;
    }

    // Update maxExploration based on new type
    const configKey = tile.type.toUpperCase() as keyof typeof GAME_CONFIG.EXPLORATION.CLICKS_REQUIRED;
    tile.maxExploration = GAME_CONFIG.EXPLORATION.CLICKS_REQUIRED[configKey] ?? 1;
  });

  // 8. Broken Tracks
  const trackTiles = newGrid.filter(t => t.type === 'track');
  const brokenCount = Math.min(trackTiles.length, GAME_CONFIG.MAP.BROKEN_TRACKS.BASE + (station) * GAME_CONFIG.MAP.BROKEN_TRACKS.PER_SECTOR);

  for (let i = trackTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trackTiles[i], trackTiles[j]] = [trackTiles[j], trackTiles[i]];
  }

  for (let i = 0; i < brokenCount; i++) {
    trackTiles[i].isBroken = true;
  }

  // 9. Final Peek Update
  updatePeekStatus(newGrid);

  return newGrid;
};
