import React from 'react';
import { ShoppingCart, ArrowRight, Trees, Mountain, Flame } from 'lucide-react';
import { Inventory, ItemType } from '../types';
import { CARRIAGE_CAPACITY_BONUS, GAME_CONFIG } from '../constants';

interface ShopOverlayProps {
  station: number;
  gold: number;
  inventory: Inventory;
  carriageLevel: number;
  onSell: (type: ItemType) => void;
  onBuyCarriage: () => void;
  onBuyHeal: () => void;
  onNextLevel: () => void;
}

export const ShopOverlay: React.FC<ShopOverlayProps> = ({
  station,
  gold,
  inventory,
  carriageLevel,
  onSell,
  onBuyCarriage,
  onBuyHeal,
  onNextLevel
}) => {
  const buyCarriageCost = GAME_CONFIG.SHOP.BUY.CARRIAGE_BASE * (carriageLevel + 1);
  const healCost = GAME_CONFIG.SHOP.BUY.HEAL;

  const getCount = (type: string) => inventory.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
  const woodCount = getCount('wood');
  const stoneCount = getCount('stone');
  const charcoalCount = getCount('charcoal');

  return (
    <div className="absolute inset-0 z-30 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex justify-between items-center mb-8 border-b border-stone-800 pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-stone-800 rounded-xl text-amber-500 shadow-inner border border-stone-700">
              <ShoppingCart size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-stone-100 tracking-tight">Trading Post</h2>
              <p className="text-stone-500 text-sm font-mono uppercase tracking-widest">Station {station} Resupply</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono text-amber-400 font-bold tracking-tighter drop-shadow-sm">{gold} G</div>
            <div className="text-xs text-stone-500 font-bold tracking-wider">CURRENT FUNDS</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
          {/* Sell Section */}
          <div className="bg-stone-950/50 p-5 rounded-xl border border-stone-800/60">
            <h3 className="text-xs font-bold text-stone-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Sell Resources
            </h3>
            <div className="space-y-3">
              <button onClick={() => onSell('wood')} className="w-full flex justify-between items-center bg-stone-900 p-3 rounded-lg border border-stone-800 hover:border-stone-600 hover:bg-stone-800 transition-all group">
                <div className="flex items-center gap-3">
                  <Trees size={18} className="text-emerald-600 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-stone-300">Wood ({woodCount})</span>
                </div>
                <span className="text-amber-500 font-mono font-bold group-hover:scale-110 transition-transform">+{GAME_CONFIG.SHOP.SELL.WOOD} G</span>
              </button>
              <button onClick={() => onSell('stone')} className="w-full flex justify-between items-center bg-stone-900 p-3 rounded-lg border border-stone-800 hover:border-stone-600 hover:bg-stone-800 transition-all group">
                <div className="flex items-center gap-3">
                  <Mountain size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  <span className="text-stone-300">Stone ({stoneCount})</span>
                </div>
                <span className="text-amber-500 font-mono font-bold group-hover:scale-110 transition-transform">+{GAME_CONFIG.SHOP.SELL.STONE} G</span>
              </button>
              <button onClick={() => onSell('charcoal')} className="w-full flex justify-between items-center bg-stone-900 p-3 rounded-lg border border-stone-800 hover:border-stone-600 hover:bg-stone-800 transition-all group">
                <div className="flex items-center gap-3">
                  <Flame size={18} className="text-orange-600 group-hover:text-orange-400 transition-colors" />
                  <span className="text-stone-300">Charcoal ({charcoalCount})</span>
                </div>
                <span className="text-amber-500 font-mono font-bold group-hover:scale-110 transition-transform">+{GAME_CONFIG.SHOP.SELL.CHARCOAL} G</span>
              </button>
            </div>
          </div>

          {/* Buy Section */}
          <div className="bg-stone-950/50 p-5 rounded-xl border border-stone-800/60">
            <h3 className="text-xs font-bold text-stone-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Upgrades & Services
            </h3>
            <div className="space-y-3">
              <button
                onClick={onBuyCarriage}
                className="w-full bg-stone-900 p-4 rounded-lg border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={gold < buyCarriageCost}
              >
                <div>
                  <div className="font-bold text-stone-200 group-hover:text-amber-400 transition-colors">Expand Cargo Hold</div>
                  <div className="text-xs text-stone-500 mt-1">Max Load +{CARRIAGE_CAPACITY_BONUS}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-mono font-bold">-{buyCarriageCost} G</div>
                  <div className="text-[10px] text-stone-500 mt-0.5 uppercase">LVL {carriageLevel} → {carriageLevel + 1}</div>
                </div>
              </button>

              <button
                onClick={onBuyHeal}
                className="w-full bg-stone-900 p-4 rounded-lg border border-stone-800 hover:border-emerald-500/50 hover:bg-stone-800 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={gold < healCost}
              >
                <div>
                  <div className="font-bold text-stone-200 group-hover:text-emerald-400 transition-colors">Luxury Ration Pack</div>
                  <div className="text-xs text-stone-500 mt-1">Restore 100% HP & Energy</div>
                </div>
                <div className="text-amber-400 font-mono font-bold">-{healCost} G</div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onNextLevel}
          className="w-full py-4 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-emerald-900/30 transition-all transform hover:-translate-y-1 relative z-10"
        >
          <span>Depart for Next Sector</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};