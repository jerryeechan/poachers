import React from 'react';
import { Axe, Pickaxe, Sword, Search, Heart, Zap, Heart as Vitality, Swords } from 'lucide-react';
import { Tile as TileInterface, Inventory, NPCBuff } from '../types';
import { getTileConfig, GAME_CONFIG } from '../constants';

interface TileProps {
  tile: TileInterface;
  inventory: Inventory;
  weather: string;
  energy: number;
  rescuedNPCs: number;
  onTileClick: (tile: TileInterface) => void;
}

// --- Sub-Components for Specific Tile Types ---

const EnemyOverlay: React.FC<{ tile: TileInterface }> = ({ tile }) => (
  <>
    {/* Attack Power (Top Right) */}
    <div className="absolute -top-2 -right-2 bg-red-950 text-red-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-red-800 z-20 shadow-sm font-mono flex items-center gap-0.5">
      <Sword size={8} /> {tile.attack}
    </div>
    {/* HP Number (Top Left) */}
    <div className="absolute -top-2 -left-2 bg-stone-900 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-red-900 z-20 shadow-sm font-mono flex items-center gap-0.5">
      <Heart size={8} fill="currentColor" /> {tile.hp}
    </div>
  </>
);

const NPCOverlay: React.FC<{ tile: TileInterface }> = ({ tile }) => {
  const progress = (tile.rescueProgress || 0);
  const maxProgress = (tile.maxRescueProgress || 1);
  const progressPct = ((maxProgress - progress) / maxProgress) * 100;

  const buffIcons: Record<NPCBuff, any> = {
    'stamina': Zap,
    'vitality': Vitality,
    'attack': Swords
  };

  const BuffIcon = tile.npcBuff ? buffIcons[tile.npcBuff] : Zap;

  return (
    <>
      {/* Buff Icon (Top Right) */}
      <div className="absolute -top-2 -right-2 bg-blue-950 text-blue-300 text-[10px] p-1 rounded-full font-bold border border-blue-700 z-20 shadow-sm">
        <BuffIcon size={10} />
      </div>
      {/* Rescue Progress Bar (Bottom) */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-stone-900 rounded-full overflow-hidden z-20 border border-blue-900">
        <div
          className="h-full bg-blue-400 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </>
  );
};

const ScavengeOverlay: React.FC<{ tile: TileInterface }> = ({ tile }) => (
  <div className="absolute bottom-1 flex gap-0.5 z-10 bg-black/20 px-1 rounded-full">
    {Array.from({ length: Math.min(3, tile.scavengeLeft) }).map((_, i) => (
      <div key={i} className={`w-1 h-1 rounded-full ${tile.type === 'tree' ? 'bg-emerald-400' : 'bg-stone-400'}`}></div>
    ))}
  </div>
);

const BadgesOverlay: React.FC<{
  tile: TileInterface,
  config: any,
  actionCost: number,
  showStaminaCost: boolean,
  hasTool: boolean
}> = ({ tile, config, actionCost, showStaminaCost, hasTool }) => (
  <>
    {/* Stamina Cost Badge */}
    {showStaminaCost && (
      <div className="absolute -bottom-2 -right-2 z-20 bg-stone-900 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-700 shadow-md font-mono font-bold">
        {actionCost}
      </div>
    )}

    {/* Tool Requirement Badge */}
    {config.tool && !tile.cleared && tile.type !== 'enemy' && (
      <div className={`
        absolute -top-2 -right-2 z-20 bg-stone-900 text-[10px] p-1 rounded-full border shadow-md
        ${hasTool ? 'border-emerald-600 text-emerald-400' : 'border-red-900 text-red-500'}
      `}>
        {config.tool === 'axe' ? <Axe size={10} /> : config.tool === 'pickaxe' ? <Pickaxe size={10} /> : <Sword size={10} />}
      </div>
    )}
  </>
);

// --- Main Tile Component ---

export const Tile: React.FC<TileProps> = ({ tile, inventory, weather, energy, rescuedNPCs, onTileClick }) => {
  const config = getTileConfig(tile.type);
  const Icon = config.icon || Search;

  // 1. Calculate Costs & Requirements
  let actionCost = weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;
  if (tile.type === 'search') {
    const tileSearchCount = tile.searchCount || 0;
    actionCost = GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
  } else if (tile.type === 'tree') {
    const tileSearchCount = tile.searchCount || 0;
    actionCost = GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
  } else if (tile.type === 'enemy') {
    actionCost = GAME_CONFIG.ACTIONS.ENEMY_COST;
  }

  const hasEnergy = energy >= actionCost;
  const hasTool = config.tool
    ? inventory.some(item => item?.type === config.tool && (item.durability === undefined || item.durability > 0))
    : true;

  // 2. Determine State
  const isRevealed = tile.revealed;
  const isPeeked = !isRevealed && tile.peeked;
  const isHidden = !isRevealed && !isPeeked;
  const isVoid = tile.type === 'void';

  const isInteractable = isRevealed && !isVoid && tile.type !== 'track' &&
    (!tile.cleared || ((tile.type === 'search' || tile.type === 'tree') && tile.scavengeLeft > 0) || (tile.type === 'npc' && !tile.cleared));

  const showStaminaCost = isInteractable;// && ['search', 'tree', 'rock'].includes(tile.type);

  // 3. Determine Styles
  let containerClass = `
    relative group flex items-center justify-center
    w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 
    rounded-xl transition-all duration-200
    focus:outline-none
  `;

  if (isHidden) {
    containerClass += ' bg-stone-900 border-2 border-stone-800/50 shadow-inner';
  } else if (isPeeked) {
    containerClass += isVoid ? ' opacity-0' : ` ${config.color} opacity-40 grayscale border-2 border-transparent`;
  } else {
    // Revealed
    if (isVoid) {
      containerClass += ' opacity-0 pointer-events-none';
    } else {
      containerClass += ` ${config.color} shadow-md border-2`;
      containerClass += tile.type === 'track' ? ' border-transparent' : ' border-black/10';

      if (isInteractable) {
        if (hasEnergy && hasTool) {
          containerClass += ' cursor-pointer hover:scale-105 hover:border-white/40 hover:shadow-xl hover:z-10 active:scale-95';
        } else {
          containerClass += ' cursor-not-allowed opacity-80 grayscale-[0.5]';
        }
      } else {
        containerClass += ' cursor-default';
        if (tile.cleared) containerClass += ' opacity-60';
      }
    }
  }

  const animationClass = tile.effect === 'pop' ? 'animate-ping-once' : tile.effect === 'flash' ? 'bg-red-500/50' : '';

  // 4. Render
  return (
    <button
      onClick={() => onTileClick(tile)}
      disabled={!isInteractable}
      className={`${containerClass} ${animationClass}`}
    >
      {isRevealed && !isVoid && (
        <>
          {tile.type === 'track' && <div className="absolute w-[140%] h-[4px] bg-stone-700/50 rounded-full" />}

          <Icon size={20} className={`relative z-10 drop-shadow-md ${tile.type === 'enemy' ? 'animate-pulse' : ''}`} />

          {/* Overlays based on Type */}
          {tile.type === 'enemy' && !tile.cleared && <EnemyOverlay tile={tile} />}

          {tile.type === 'npc' && !tile.cleared && <NPCOverlay tile={tile} />}

          {tile.scavengeLeft > 0 && (tile.type === 'search' || tile.type === 'tree') && <ScavengeOverlay tile={tile} />}

          {/* Train NPC Count Badge */}
          {tile.type === 'train' && rescuedNPCs > 0 && (
            <div className="absolute -bottom-2 -right-2 bg-blue-950 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-blue-700 z-20 shadow-sm font-mono">
              {rescuedNPCs}
            </div>
          )}

          {/* Common Badges */}
          <BadgesOverlay
            tile={tile}
            config={config}
            actionCost={actionCost}
            showStaminaCost={showStaminaCost}
            hasTool={hasTool}
          />
        </>
      )}
    </button>
  );
};
