
import React from 'react';
import { Axe, Pickaxe, Sword, Search } from 'lucide-react';
import { Tile as TileInterface, Tools } from '../types';
import { getTileConfig, GAME_CONFIG } from '../constants';

interface TileProps {
  tile: TileInterface;
  tools: Tools;
  weather: string;
  energy: number;
  onTileClick: (tile: TileInterface) => void;
}

export const Tile: React.FC<TileProps> = ({ tile, tools, weather, energy, onTileClick }) => {
  const config = getTileConfig(tile.type);
  const Icon = config.icon || Search;

  const actionCost = weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;
  const hasEnergy = energy >= actionCost;
  const isTrain = tile.type === 'train';
  
  // --- STATE LOGIC ---
  const isRevealed = tile.revealed;
  const isPeeked = !isRevealed && tile.peeked;
  const isHidden = !isRevealed && !isPeeked;
  const isVoid = tile.type === 'void';

  // Interactivity: Only allowed if FULLY REVEALED
  const isInteractable =
    isRevealed &&
    !isVoid &&
    tile.type !== 'track' &&
    (!tile.cleared || ((tile.type === 'empty' || tile.type === 'tree') && tile.scavengeLeft > 0));

  // --- STYLE LOGIC ---
  
  // 1. Background & Visibility
  let appearanceClass = '';
  
  if (isHidden) {
    // FOG OF WAR: Uniform dark block
    appearanceClass = 'bg-stone-900 border border-stone-800/20 opacity-100'; 
  } 
  else if (isPeeked) {
    // PEEKED: Show color/hint, but dimmed. No interactions.
    if (isVoid) {
      appearanceClass = 'opacity-0 border-none'; // Gap is visible
    } else {
      // Visible color but darker (50% opacity), no border detail
      appearanceClass = `${config.color} opacity-50 border-none cursor-default grayscale-[0.3]`;
    }
  } 
  else {
    // REVEALED: Full visuals
    if (isVoid) {
       appearanceClass = 'opacity-0 pointer-events-none';
    } else {
       appearanceClass = `${config.color} shadow-lg opacity-100`;
       if (tile.type !== 'track') appearanceClass += ' border-t border-l border-r';
    }
  }

  // 2. Interaction/Status Cursor
  let cursorClass = 'cursor-default';
  if (isRevealed && !isVoid) {
     if (isInteractable) {
        if (hasEnergy) {
           cursorClass = 'cursor-pointer hover:scale-105 hover:z-10 active:scale-95';
        } else {
           cursorClass = 'cursor-not-allowed grayscale opacity-50';
        }
     } else if (isTrain) {
       cursorClass = 'cursor-default';
     } else {
       // Revealed but cleared/empty
       cursorClass = 'cursor-default opacity-60';
     }
  }

  const animationClass = tile.effect === 'pop' ? 'animate-ping-once' : tile.effect === 'flash' ? 'bg-red-500/50' : '';

  return (
    <button
      onClick={() => onTileClick(tile)}
      disabled={!isInteractable}
      className={`
        w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-md transition-all duration-300 relative group
        flex items-center justify-center
        ${appearanceClass}
        ${cursorClass}
        ${animationClass}
      `}
    >
      {/* CONTENT LAYER (Only if Fully Revealed and Not Void) */}
      {isRevealed && !isVoid && (
        <>
          {tile.type === 'track' && <div className="absolute w-[140%] h-[4px] bg-stone-700/50 rounded-full" />}

          <Icon size={20} className={`relative z-10 drop-shadow-md ${tile.type === 'enemy' ? 'animate-pulse' : ''}`} />

          {/* Enemy HP Indicator */}
          {tile.type === 'enemy' && !tile.cleared && (
            <div className="absolute -bottom-2 -right-2 bg-red-900 text-red-100 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-red-700 z-20 shadow-sm font-mono">
              {tile.attack}
            </div>
          )}

          {/* Scavenge Dots */}
          {tile.scavengeLeft > 0 && (tile.type === 'empty' || tile.type === 'tree') && (
            <div className="absolute bottom-1 flex gap-0.5 z-10 bg-black/20 px-1 rounded-full">
              {Array.from({ length: Math.min(3, tile.scavengeLeft) }).map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-full ${tile.type === 'tree' ? 'bg-emerald-400' : 'bg-stone-400'}`}></div>
              ))}
            </div>
          )}

          {/* Tool Requirement Badge */}
          {config.tool && !tile.cleared && (
            <div className={`
              absolute -top-2 -right-2 z-20 bg-stone-900 text-[10px] p-1 rounded-full border shadow-md
              ${tools[config.tool] > 0 ? 'border-emerald-600 text-emerald-400' : 'border-red-900 text-red-500'}
            `}>
              {config.tool === 'axe' ? <Axe size={10}/> : config.tool === 'pickaxe' ? <Pickaxe size={10}/> : <Sword size={10}/>}
            </div>
          )}
        </>
      )}
    </button>
  );
};
