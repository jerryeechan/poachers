
import { GAME_CONFIG, MAX_ENERGY } from '../constants';
import { RestReport, Tile as TileType } from '../types';

export const getAvatarFace = (hp: number, maxHp: number, energy: number, maxEnergy: number): string => {
  const hpPct = hp / maxHp;
  const energyPct = energy / maxEnergy;

  if (hp <= 0) return '💀';
  if (hpPct < GAME_CONFIG.AVATAR.HP_CRITICAL_PCT) return '🤕';
  if (energyPct < GAME_CONFIG.AVATAR.ENERGY_EXHAUSTED_PCT) return '😫';
  if (energyPct < GAME_CONFIG.AVATAR.ENERGY_TIRED_PCT) return '😐';
  return '🤠';
};

export const calculateRestOutcome = (
  grid: TileType[],
  pressure: number,
  energy: number,
  maxEnergy: number,
  station: number,
  san: number,
  forceSpawnCount?: number
): RestReport => {
  // No HP healing on rest
  const activeEnemies = grid.filter(t => t.type === 'enemy' && t.revealed && !t.cleared);
  const totalEnemyDmg = activeEnemies.reduce((sum, t) => sum + t.attack, 0);

  // Calculate enemy spawn rate based on san
  const sanModifier = san * 0.2;
  const baseEnemyRate = GAME_CONFIG.MAP.PROBS.DANGER.ENEMY_BASE + (station * GAME_CONFIG.MAP.PROBS.DANGER.ENEMY_SCALE);
  const enemySpawnRate = (baseEnemyRate + sanModifier) * 100; // Convert to percentage

  // Determine how many enemies should spawn
  // If forceSpawnCount is provided (from animation), use it. Otherwise calculate based on floor.
  const enemySpawnCount = forceSpawnCount !== undefined
    ? forceSpawnCount
    : Math.floor(enemySpawnRate / 100);

  const safeTiles = grid.filter(t => t.cleared && t.type === 'search');
  const spawnedEnemies: { id: string; attack: number; hp: number }[] = [];

  // Spawn enemies based on spawn rate
  for (let i = 0; i < enemySpawnCount && safeTiles.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * safeTiles.length);
    const targetTile = safeTiles.splice(randomIndex, 1)[0]; // Remove from array to avoid duplicate spawns

    const attack = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.ATTACK_VAR) +
      GAME_CONFIG.MAP.ENEMIES.ATTACK_MIN +
      Math.floor(station * GAME_CONFIG.MAP.ENEMIES.ATTACK_STATION_MULT);
    const hp = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.HP_VAR) +
      GAME_CONFIG.MAP.ENEMIES.HP_MIN +
      Math.floor(station * GAME_CONFIG.MAP.ENEMIES.HP_STATION_MULT);

    spawnedEnemies.push({ id: targetTile.id, attack, hp });
  }

  // Old ambush system removed in favor of new spawn system
  const ambushEvent = null;

  return {
    heal: 0, // No healing
    energyRec: maxEnergy - energy,
    dmg: totalEnemyDmg,
    pressureLoss: Math.min(pressure, GAME_CONFIG.TRAIN.DECAY_ON_REST),
    enemiesCount: activeEnemies.length,
    ambush: ambushEvent,
    spawnedEnemies
  };
};
