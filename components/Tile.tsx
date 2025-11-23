
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

  let actionCost = weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;
  if (tile.type === 'search') {
    const tileSearchCount = tile.searchCount || 0;
    actionCost = GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
  }
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
    (!tile.cleared || ((tile.type === 'search' || tile.type === 'tree') && tile.scavengeLeft > 0));

  const showStaminaCost = isInteractable && ['search', 'tree', 'rock'].includes(tile.type);

  // --- STYLE LOGIC ---
  let containerClass = `
    relative group flex items-center justify-center
    w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 
    rounded-xl transition-all duration-200
    focus:outline-none
  `;

  if (isHidden) {
    // FOG OF WAR
    containerClass += ' bg-stone-900 border-2 border-stone-800/50 shadow-inner';
  }
  else if (isPeeked) {
    // PEEKED
    if (isVoid) {
      containerClass += ' opacity-0';
    } else {
      containerClass += ` ${config.color} opacity-40 grayscale border-2 border-transparent`;
    }
  }
  else {
    // REVEALED
    if (isVoid) {
      containerClass += ' opacity-0 pointer-events-none';
    } else {
      containerClass += ` ${config.color} shadow-md border-2`;

      // Border Style
      if (tile.type === 'track') {
        containerClass += ' border-transparent';
      } else {
        containerClass += ' border-black/10';
      }

      // Interaction States
      if (isInteractable) {
        if (hasEnergy) {
          // Interactive & Affordable
          containerClass += ' cursor-pointer hover:scale-105 hover:border-white/40 hover:shadow-xl hover:z-10 active:scale-95';
        } else {
          // Interactive but No Energy
          containerClass += ' cursor-not-allowed opacity-80 grayscale-[0.5]';
        }
      } else {
        // Not Interactive (Cleared, Track, Train, etc.)
        containerClass += ' cursor-default';
        if (tile.cleared) containerClass += ' opacity-60';
      }
    }
  }

  const animationClass = tile.effect === 'pop' ? 'animate-ping-once' : tile.effect === 'flash' ? 'bg-red-500/50' : '';

  return (
    <button
      onClick={() => onTileClick(tile)}
      disabled={!isInteractable}
      className={`${containerClass} ${animationClass}`}
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
          {tile.scavengeLeft > 0 && (tile.type === 'search' || tile.type === 'tree') && (
            <div className="absolute bottom-1 flex gap-0.5 z-10 bg-black/20 px-1 rounded-full">
              {Array.from({ length: Math.min(3, tile.scavengeLeft) }).map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-full ${tile.type === 'tree' ? 'bg-emerald-400' : 'bg-stone-400'}`}></div>
              ))}
            </div>
          )}

          {/* Stamina Cost Badge */}
          {showStaminaCost && (
            <div className="absolute -bottom-2 -right-2 z-20 bg-stone-900 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-700 shadow-md font-mono font-bold">
              {actionCost}
            </div>
          )}

          {/* Tool Requirement Badge */}
          {config.tool && !tile.cleared && (
            <div className={`
              absolute -top-2 -right-2 z-20 bg-stone-900 text-[10px] p-1 rounded-full border shadow-md
              ${tools[config.tool] > 0 ? 'border-emerald-600 text-emerald-400' : 'border-red-900 text-red-500'}
            `}>
              {config.tool === 'axe' ? <Axe size={10} /> : config.tool === 'pickaxe' ? <Pickaxe size={10} /> : <Sword size={10} />}
            </div>
          )}
        </>
      )}
    </button>
  );
};
