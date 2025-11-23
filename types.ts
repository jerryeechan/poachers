import { LucideIcon } from 'lucide-react';

export type ResourceType = 'wood' | 'stone' | 'charcoal';
export type ToolType = 'axe' | 'pickaxe' | 'bow';
export type TileTypeStr = 'void' | 'track' | 'search' | 'train' | 'tree' | 'rock' | 'enemy' | 'npc';
export type WeatherType = 'sunny' | 'rain' | 'windy';
export type ViewState = 'map' | 'shop' | 'gameover';

export interface Item {
  id: string; // Unique ID for the item instance (optional, but good for React keys)
  type: ItemType;
  count: number;
  durability?: number;
  maxDurability?: number;
}

export type ItemType = 'wood' | 'stone' | 'charcoal' | 'axe' | 'pickaxe' | 'bow';

export type Inventory = (Item | null)[];

// Deprecated but keeping for now to avoid breaking everything immediately, 
// though we will remove usage in App.tsx
export interface Resources {
  wood: number;
  stone: number;
  charcoal: number;
}

export interface Tools {
  axe: number;
  pickaxe: number;
  bow: number;
}

export interface TileConfig {
  id: TileTypeStr;
  icon: LucideIcon | null;
  color: string;
  tool?: ToolType;
}

export type NPCBuff = 'stamina' | 'vitality' | 'attack';

export interface Tile {
  id: string;
  x: number;
  y: number;
  type: TileTypeStr;
  revealed: boolean;
  peeked: boolean; // New property for Fog of War
  cleared: boolean;
  scavengeLeft: number;
  attack: number;
  effect: 'pop' | 'flash' | null;
  searchCount?: number;
  hp?: number;
  maxHp?: number;
  // NPC Properties
  npcBuff?: NPCBuff;
  rescueProgress?: number;
  maxRescueProgress?: number;
}

export interface Recipe {
  input: { type: ItemType; count: number }[];
  output: { type: ItemType; count: number; durability?: number };
  desc: string;
  staminaCost?: number;
}

export interface LogEntry {
  id: number;
  text: string;
  type: 'neutral' | 'success' | 'error' | 'warning' | 'important';
}

export interface RestReport {
  heal: number;
  energyRec: number;
  dmg: number;
  pressureLoss: number;
  enemiesCount: number;
  ambush: { id: string; attack: number } | null;
  spawnedEnemies?: { id: string; attack: number; hp: number }[];
}

export interface GameStats {
  totalWood: number;
  totalStone: number;
  enemiesDefeated: number;
  itemsCrafted: number;
  stationsPassed: number;
  san: number; // Sanity - affects enemy spawn rate
}