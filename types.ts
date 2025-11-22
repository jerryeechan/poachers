import { LucideIcon } from 'lucide-react';

export type ResourceType = 'wood' | 'stone' | 'charcoal';
export type ToolType = 'axe' | 'pickaxe' | 'bow';
export type TileTypeStr = 'void' | 'track' | 'empty' | 'train' | 'tree' | 'rock' | 'enemy';
export type WeatherType = 'sunny' | 'rain' | 'windy';
export type ViewState = 'map' | 'shop' | 'gameover';

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
}

export interface Recipe {
  input: Partial<Resources>;
  output: {
    charcoal?: number;
    tool?: ToolType;
  };
  desc: string;
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
}

export interface GameStats {
  totalWood: number;
  totalStone: number;
  enemiesDefeated: number;
  itemsCrafted: number;
  stationsPassed: number;
}