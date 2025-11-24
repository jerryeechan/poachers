import {
  Train, Trees, MoreHorizontal, Mountain, Skull, Search,
  Axe, Pickaxe, Crosshair, Flame, Box, Gem, User, Key, Grape, Hammer, Users
} from 'lucide-react';
import { Recipe, TileConfig, TileTypeStr, ItemType } from './types';

export const GRID_SIZE = 8;
export const MAX_ENERGY = 20;
export const MAX_HP = 20;
export const MAX_TOOL_DURABILITY = 5;
export const BASE_CAPACITY = 20;
export const CARRIAGE_CAPACITY_BONUS = 10;
export const INVENTORY_SIZE = 8;

export const ITEM_CONFIG: Record<ItemType, { name: string; icon: any; maxStack: number; desc: string }> = {
  wood: { name: 'Wood', icon: Trees, maxStack: 64, desc: 'Basic building material' },
  stone: { name: 'Stone', icon: Gem, maxStack: 64, desc: 'Strong material' },
  charcoal: { name: 'Charcoal', icon: Flame, maxStack: 64, desc: 'High energy fuel' },
  axe: { name: 'Axe', icon: Axe, maxStack: 1, desc: 'For chopping trees' },
  pickaxe: { name: 'Pickaxe', icon: Pickaxe, maxStack: 1, desc: 'For mining rocks' },
  bow: { name: 'Bow', icon: Crosshair, maxStack: 1, desc: 'For hunting enemies' },
  key: { name: 'Key', icon: Key, maxStack: 10, desc: 'Opens locked chests' },
  berry: { name: 'Wild Berry', icon: Grape, maxStack: 16, desc: 'Restores 1 HP & 3 Energy' },
};

export const GAME_CONFIG = {
  AVATAR: {
    HP_CRITICAL_PCT: 0.3,       // 30% HP
    ENERGY_EXHAUSTED_PCT: 0.2,  // 20% Energy
    ENERGY_TIRED_PCT: 0.5,      // 50% Energy
  },
  ACTIONS: {
    COST_BASE: 1,
    COST_WINDY: 12,
    PLAYER_BASE_DMG: 1,
    BOW_DMG: 3,
    SEARCH_COST_INITIAL: 3,
    SEARCH_COST_INCREASE: -1,
    ENEMY_COST: 2,
  },
  TRAIN: {
    PRESSURE_BASE: 50,
    PRESSURE_PER_STATION: 20,
    FUEL_GAIN_WOOD: 2,
    FUEL_GAIN_CHARCOAL: 10,
    DECAY_ON_REST: 10,
  },
  EXPLORATION: {
    CLICKS_REQUIRED: {
      TREE: 1,
      ROCK: 1,
      ENEMY: 1,
      SEARCH: 1, // Empty ground is easy to see
      TRACK: 1,
      NPC: 1,
      TRAIN: 0, // Should be visible immediately usually
      LOCOMOTIVE: 0,
      WORKSHOP_CARRIAGE: 0,
      CARGO_CARRIAGE: 0,
      PASSENGER_CARRIAGE: 0,
      VOID: 0,
    },
    REWARD: {
      TREE: { type: 'wood' as const, count: 1 },
      ROCK: { type: 'stone' as const, count: 1 },
    },
  },
  MAP: {
    SAFE_ZONE_OFFSET: 1, // Distance from center track
    VOID: {
      DIST_THRESHOLD: 3,
      CHANCE_MULT: 0.4,
    },
    PROBS: {
      // Safe Zone: Center track +/- 1
      SAFE: { TREE: 0.35, ROCK: 0.50, ENEMY_BASE: 0.2, ENEMY_SCALE: 0.02, NPC: 0.55 },
      // Danger Zone: Everywhere else
      DANGER: { TREE: 0.28, ROCK: 0.42, ENEMY_BASE: 0.2, ENEMY_SCALE: 0.03, NPC: 0.50 },
    },
    NPC: {
      RESCUE_TURNS_MIN: 3,
      RESCUE_TURNS_VAR: 1,
      TRAIN_CAPACITY_BASE: 3,
      MIN_DISTANCE_FROM_TRAIN: 4,
    },
    LOOT: {
      TREE_MIN: 2, TREE_VAR: 3,
      ROCK_MIN: 3, ROCK_VAR: 2,
      SCAVENGE_VAR: 3, SCAVENGE_MIN: 1,
      EMPTY_CHANCE_WOOD: 0.45,
      EMPTY_CHANCE_STONE_THRESHOLD: 0.80,
      BERRY_CHANCE: 1,
      BERRY_MIN: 1, BERRY_VAR: 2,
    },
    ENEMIES: {
      ATTACK_MIN: 1, ATTACK_VAR: 2,
      PASSIVE_ATTACK_INTERVAL: 30, // Minutes
      HP_MIN: 1, HP_VAR: 2,
      LEVEL_CONFIG: {
        BASE: 0,
        STATION_MULT: 0.5,
        SANITY_MULT: 0.01,
      },
      LOOT_WOOD_MIN: 1, LOOT_WOOD_VAR: 3,
      LOOT_STONE_MIN: 1, LOOT_STONE_VAR: 2,
      LOOT_GOLD_MIN: 1, LOOT_GOLD_VAR: 5,
      LOOT_KEY_CHANCE_BASE: 0.05,
      LOOT_KEY_CHANCE_LEVEL_MULT: 0.01,
    },
    BROKEN_TRACKS: {
      BASE: 1,
      PER_SECTOR: 1,
      REPAIR_COST_WOOD: 1,
      REPAIR_COST_STONE: 1,
      REPAIR_CLICKS: 3,
    },
    DECK: {
      TREE_PCT: 0.30,
      ROCK_PCT: 0.30,
      ENEMY_PCT: 0.15,
      MIN_TREES: 5,
      MIN_ROCKS: 5,
      MIN_ENEMIES: 3,
      MIN_NPCS: 1,
    }
  },
  REST: {
    HEAL_AMOUNT: 30,
    AMBUSH_CHANCE: 0.4, // 40% (1 - 0.6)
    AMBUSH_ATTACK_MIN: 1,
    AMBUSH_ATTACK_VAR: 1,
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
  },
  ITEMS: {
    BERRY: {
      HEAL: 1,
      ENERGY: 3,
    }
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
    input: [{ type: 'wood', count: 2 }, { type: 'stone', count: 5 }],
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
  NPC: { id: 'npc', icon: User, color: 'bg-blue-900 text-blue-300 border-blue-800 hover:border-blue-500' },
  LOCOMOTIVE: { id: 'locomotive', icon: Train, color: 'bg-amber-600 text-stone-900 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-500/50' },
  WORKSHOP_CARRIAGE: { id: 'workshop_carriage', icon: Hammer, color: 'bg-amber-700 text-stone-900 shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50' },
  CARGO_CARRIAGE: { id: 'cargo_carriage', icon: Box, color: 'bg-amber-800 text-stone-900 shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50' },
  PASSENGER_CARRIAGE: { id: 'passenger_carriage', icon: Users, color: 'bg-amber-700 text-stone-900 shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50' },
  BRIDGE: { id: 'bridge', icon: MoreHorizontal, color: 'bg-stone-800 text-stone-500 border-stone-700 border-dashed' },
};

export const getTileConfig = (type: TileTypeStr): TileConfig => {
  const key = type.toUpperCase();
  return TILE_TYPES[key] || TILE_TYPES.SEARCH;
};