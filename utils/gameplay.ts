
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
  maxEnergy: number
): RestReport => {
  // No HP healing on rest
  const activeEnemies = grid.filter(t => t.type === 'enemy' && t.revealed && !t.cleared);
  const totalEnemyDmg = activeEnemies.reduce((sum, t) => sum + t.attack, 0);
  
  const safeTiles = grid.filter(t => t.cleared && t.type === 'empty');
  let ambushEvent = null;
  
  if (safeTiles.length > 0 && Math.random() > (1 - GAME_CONFIG.REST.AMBUSH_CHANCE)) {
    const targetTile = safeTiles[Math.floor(Math.random() * safeTiles.length)];
    ambushEvent = { 
        id: targetTile.id, 
        attack: Math.floor(Math.random() * GAME_CONFIG.REST.AMBUSH_ATTACK_VAR) + GAME_CONFIG.REST.AMBUSH_ATTACK_MIN 
    };
  }

  return {
    heal: 0, // No healing
    energyRec: maxEnergy - energy,
    dmg: totalEnemyDmg,
    pressureLoss: Math.min(pressure, GAME_CONFIG.TRAIN.DECAY_ON_REST),
    enemiesCount: activeEnemies.length,
    ambush: ambushEvent
  };
};
