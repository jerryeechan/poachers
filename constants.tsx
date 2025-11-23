import {
  Train, Trees, MoreHorizontal, Mountain, Skull, Search,
  Axe, Pickaxe, Crosshair, Flame, Box, Gem
} from 'lucide-react';
import { Recipe, TileConfig, TileTypeStr, ItemType } from './types';

export const GRID_SIZE = 8;
export const MAX_ENERGY = 20;
export const MAX_HP = 20;
export const MAX_TOOL_DURABILITY = 5;
export const BASE_CAPACITY = 100;
export const CARRIAGE_CAPACITY_BONUS = 10;
export const INVENTORY_SIZE = 10;

export const ITEM_CONFIG: Record<ItemType, { name: string; icon: any; maxStack: number; desc: string }> = {
  wood: { name: 'Wood', icon: Trees, maxStack: 64, desc: 'Basic building material' },
  stone: { name: 'Stone', icon: Gem, maxStack: 64, desc: 'Strong material' },
  charcoal: { name: 'Charcoal', icon: Flame, maxStack: 64, desc: 'High energy fuel' },
  axe: { name: 'Axe', icon: Axe, maxStack: 1, desc: 'For chopping trees' },
  pickaxe: { name: 'Pickaxe', icon: Pickaxe, maxStack: 1, desc: 'For mining rocks' },
  bow: { name: 'Bow', icon: Crosshair, maxStack: 1, desc: 'For hunting enemies' },
};

export const GAME_CONFIG = {
  AVATAR: {
    HP_CRITICAL_PCT: 0.3,       // 30% HP
    ENERGY_EXHAUSTED_PCT: 0.2,  // 20% Energy
    ENERGY_TIRED_PCT: 0.5,      // 50% Energy
  },
  ACTIONS: {
    COST_BASE: 5,
    COST_WINDY: 12,
    BOW_BONUS_DMG: 2,
    SEARCH_COST_INITIAL: 5,
    SEARCH_COST_INCREASE: -2,
  },
  TRAIN: {
    PRESSURE_BASE: 50,
    PRESSURE_PER_STATION: 20,
    FUEL_GAIN_WOOD: 5,
    FUEL_GAIN_CHARCOAL: 15,
    DECAY_ON_REST: 10,
  },
  MAP: {
    SAFE_ZONE_OFFSET: 1, // Distance from center track
    VOID: {
      DIST_THRESHOLD: 3,
      CHANCE_MULT: 0.4,
    },
    PROBS: {
      // Safe Zone: Center track +/- 1
      SAFE: { TREE: 0.35, ROCK: 0.50, ENEMY_BASE: 0.52, ENEMY_SCALE: 0.02 },
      // Danger Zone: Everywhere else
      DANGER: { TREE: 0.28, ROCK: 0.42, ENEMY_BASE: 0.47, ENEMY_SCALE: 0.03 },
    },
    LOOT: {
      TREE_MIN: 2, TREE_VAR: 3,
      ROCK_MIN: 3, ROCK_VAR: 2,
      SCAVENGE_VAR: 3, SCAVENGE_MIN: 1,
      EMPTY_CHANCE_WOOD: 0.45,
      EMPTY_CHANCE_STONE_THRESHOLD: 0.80,
    },
    ENEMIES: {
      ATTACK_MIN: 2, ATTACK_VAR: 3, ATTACK_STATION_MULT: 0.5,
      LOOT_WOOD_MIN: 1, LOOT_WOOD_VAR: 3,
      LOOT_STONE_MIN: 1, LOOT_STONE_VAR: 2,
    }
  },
  REST: {
    HEAL_AMOUNT: 30,
    AMBUSH_CHANCE: 0.4, // 40% (1 - 0.6)
    AMBUSH_ATTACK_MIN: 3,
    AMBUSH_ATTACK_VAR: 3,
  },
  SHOP: {
    SELL: { WOOD: 5, STONE: 8, CHARCOAL: 15 },
    BUY: {
      HEAL: 50,
      CARRIAGE_BASE: 100,
    }
  },
  LEVEL_TRANSITION: {
    ENERGY_RETAIN_PCT: 0.8,
  },
  SCORING: {
    PER_WOOD: 10,
    PER_STONE: 15,
    PER_ENEMY: 100,
    PER_CRAFT: 50,
    PER_STATION: 500,
    PER_GOLD: 1,
  }
};

export const RECIPES: Record<string, Recipe> = {
  charcoal: {
    input: [{ type: 'wood', count: 3 }],
    output: { type: 'charcoal', count: 1 },
    desc: "Convert wood to high-energy fuel",
    staminaCost: 1
  },
  axe: {
    input: [{ type: 'wood', count: 1 }, { type: 'stone', count: 1 }],
    output: { type: 'axe', count: 1, durability: MAX_TOOL_DURABILITY },
    desc: "Logging (Durability 5)",
    staminaCost: 1
  },
  pickaxe: {
    input: [{ type: 'wood', count: 5 }, { type: 'stone', count: 1 }],
    output: { type: 'pickaxe', count: 1, durability: MAX_TOOL_DURABILITY },
    desc: "Mining (Durability 5)",
    staminaCost: 1
  },
  bow: {
    input: [{ type: 'wood', count: 10 }, { type: 'stone', count: 5 }],
    output: { type: 'bow', count: 1, durability: MAX_TOOL_DURABILITY },
    desc: "Weapon (Durability 5)",
    staminaCost: 1
  },
};

export const TILE_TYPES: Record<string, TileConfig> = {
  VOID: { id: 'void', icon: null, color: 'bg-transparent pointer-events-none' },
  TRACK: { id: 'track', icon: MoreHorizontal, color: 'bg-stone-900/50 text-stone-600 border-stone-800/30' },
  SEARCH: { id: 'search', icon: Search, color: 'bg-stone-800 text-stone-600 hover:border-stone-600' },
  TRAIN: { id: 'train', icon: Train, color: 'bg-amber-600 text-stone-900 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-500/50' },
  TREE: { id: 'tree', icon: Trees, color: 'bg-emerald-900 text-emerald-400 border-emerald-800 hover:border-emerald-500', tool: 'axe' },
  ROCK: { id: 'rock', icon: Mountain, color: 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-400', tool: 'pickaxe' },
  ENEMY: { id: 'enemy', icon: Skull, color: 'bg-red-950 text-red-400 border-red-900 hover:border-red-500', tool: 'bow' },
};

export const getTileConfig = (type: TileTypeStr): TileConfig => {
  const key = type.toUpperCase();
  return TILE_TYPES[key] || TILE_TYPES.SEARCH;
};