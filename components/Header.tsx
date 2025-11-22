import React from 'react';
import { Flame, Droplets, Wind, Coins, Trees, Mountain, Train } from 'lucide-react';
import { Resources, WeatherType, ViewState } from '../types';
import { GAME_CONFIG } from '../constants';

interface HeaderProps {
  station: number;
  weather: WeatherType;
  gold: number;
  resources: Resources;
  pressure: number;
  targetPressure: number;
  viewState: ViewState;
  onAddFuel: (type: 'wood' | 'charcoal') => void;
  onDepart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  station,
  weather,
  gold,
  resources,
  pressure,
  targetPressure,
  viewState,
  onAddFuel,
  onDepart
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 p-3 shadow-xl z-20 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-4">
            <div className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700 flex items-center gap-2">
              <span className="font-bold text-amber-500 text-sm">SECTOR {station}</span>
            </div>
            <div className="flex gap-2 items-center text-stone-400 bg-stone-800/50 px-2 py-1 rounded-full">
              {weather === 'sunny' ? <Flame size={12} className="text-amber-400"/> : 
               weather === 'rain' ? <Droplets size={12} className="text-blue-400"/> : 
               <Wind size={12} className="text-slate-400"/>}
              <span className="uppercase text-[10px] font-bold tracking-wider">
                {weather === 'sunny' ? 'Clear' : weather === 'rain' ? 'Rain' : 'Windy'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-400 font-mono text-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded-full">
            <Coins size={14} />
            <span className="font-bold">{gold} G</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Resources */}
          <div className="flex gap-2 sm:gap-3 items-center">
             <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-md border border-stone-700 group transition-colors hover:border-emerald-500/50">
               <Trees size={14} className="text-emerald-500"/>
               <span className="font-mono text-sm min-w-[20px] text-center">{resources.wood}</span>
               <button onClick={() => onAddFuel('wood')} className="ml-1 hover:bg-stone-700 rounded p-1 text-stone-500 hover:text-orange-400 transition-colors" title={`Burn Wood (+${GAME_CONFIG.TRAIN.FUEL_GAIN_WOOD} PSI)`}>
                 <Flame size={12}/>
               </button>
             </div>
             <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-md border border-stone-700 group transition-colors hover:border-orange-500/50">
               <Flame size={14} className="text-orange-500"/>
               <span className="font-mono text-sm min-w-[20px] text-center">{resources.charcoal}</span>
               <button onClick={() => onAddFuel('charcoal')} className="ml-1 hover:bg-stone-700 rounded p-1 text-stone-500 hover:text-orange-400 transition-colors" title={`Burn Charcoal (+${GAME_CONFIG.TRAIN.FUEL_GAIN_CHARCOAL} PSI)`}>
                 <Flame size={12}/>
               </button>
             </div>
             <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-md border border-stone-700">
               <Mountain size={14} className="text-stone-400"/>
               <span className="font-mono text-sm min-w-[20px] text-center">{resources.stone}</span>
             </div>
          </div>

          {/* Pressure Gauge */}
          <div className="flex-1 flex items-center gap-3 ml-2">
            <span className="text-[10px] font-bold text-stone-500 hidden md:inline tracking-wider">BOILER PRESSURE</span>
            <div className="flex-1 h-8 bg-stone-950 rounded-md border border-stone-700 relative overflow-hidden group">
               {/* Tick marks */}
               <div className="absolute inset-0 flex justify-between px-2">
                  {[...Array(5)].map((_,i) => <div key={i} className="h-full w-[1px] bg-stone-800/50 z-10" />)}
               </div>
               <div 
                  className="h-full bg-gradient-to-r from-orange-900 via-orange-600 to-amber-500 transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, (pressure / targetPressure) * 100)}%` }}
               ></div>
               <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-stone-300 mix-blend-difference z-20">
                  {pressure} / {targetPressure} PSI
               </div>
            </div>
          </div>

          <button 
            onClick={onDepart}
            disabled={pressure < targetPressure || viewState === 'shop'}
            className={`
              px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all shadow-lg
              ${pressure >= targetPressure && viewState !== 'shop' 
                ? 'bg-amber-500 text-stone-900 hover:bg-amber-400 hover:scale-105 animate-pulse' 
                : 'bg-stone-800 text-stone-600 cursor-not-allowed grayscale'}
            `}
          >
            <Train size={18}/>
            <span className="hidden sm:inline">DEPART</span>
          </button>
        </div>
      </div>
    </header>
  );
};
