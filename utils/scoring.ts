import { GAME_CONFIG } from '../constants';
import { GameStats } from '../types';

export const calculateFinalScore = (stats: GameStats, gold: number) => {
  const breakdown = [
    { label: 'Sectors Cleared', value: stats.stationsPassed, multiplier: GAME_CONFIG.SCORING.PER_STATION },
    { label: 'Wood Gathered', value: stats.totalWood, multiplier: GAME_CONFIG.SCORING.PER_WOOD },
    { label: 'Stone Gathered', value: stats.totalStone, multiplier: GAME_CONFIG.SCORING.PER_STONE },
    { label: 'Enemies Defeated', value: stats.enemiesDefeated, multiplier: GAME_CONFIG.SCORING.PER_ENEMY },
    { label: 'Items Crafted', value: stats.itemsCrafted, multiplier: GAME_CONFIG.SCORING.PER_CRAFT },
    { label: 'Gold Reserves', value: gold, multiplier: GAME_CONFIG.SCORING.PER_GOLD },
  ];

  const totalScore = breakdown.reduce((acc, item) => acc + (item.value * item.multiplier), 0);

  return { totalScore, breakdown };
};
