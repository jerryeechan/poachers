import React from 'react';
import { Flame, Droplets, Wind, Coins, Trees, Mountain, Train, Users } from 'lucide-react';
import { Inventory, WeatherType, ViewState } from '../types';
import { GAME_CONFIG } from '../constants';

interface HeaderProps {
  station: number;
  day: number;
  san: number;
  weather: WeatherType;
  gold: number;
  inventory: Inventory;
  pressure: number;
  targetPressure: number;
  viewState: ViewState;
  rescuedNPCs: { buff: 'stamina' | 'health' | 'attack' }[];
  maxTrainCapacity: number;
  onAddFuel: (type: 'wood' | 'charcoal') => void;
  onDepart: () => void;
  time: number;
}

export const Header: React.FC<HeaderProps> = ({
  station,
  day,
  san,
  weather,
  gold,
  inventory,
  pressure,
  targetPressure,
  viewState,
  rescuedNPCs,
  maxTrainCapacity,
  onAddFuel,
  onDepart,
  time
}) => {
  // Helper to get count
  const getCount = (type: string) => inventory.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
  const woodCount = getCount('wood');
  const charcoalCount = getCount('charcoal');

  // Calculate dice count
  const diceCount = 1 + Math.floor(san / 100);

  // Format Time
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <header className="bg-stone-900 border-b border-stone-800 p-3 shadow-xl z-20 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">

        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-4">
            <div className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700 flex items-center gap-2">
              <span className="font-bold text-amber-500 text-sm">SECTOR {station}</span>
            </div>
            <div className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700 flex items-center gap-2">
              <span className="font-bold text-blue-400 text-sm">DAY {day}</span>
            </div>
            <div className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700 flex items-center gap-2">
              <span className="font-bold text-purple-400 text-sm">SAN: {san}</span>
            </div>
            <div className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700 flex items-center gap-2">
              <span className="font-bold text-stone-300 text-sm">{formatTime(time)}</span>
            </div>
            <div className="bg-stone-800/50 px-3 py-1 rounded-full border border-red-700/50 flex items-center gap-2">
              <span className="font-bold text-red-400 text-[10px] uppercase tracking-wider">Danger Dice: {diceCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-yellow-400 font-mono text-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded-full">
              <Coins size={14} />
              <span className="font-bold">{gold} G</span>
            </div>
          </div>
        </div>

        {/* <div className="flex items-center gap-2 sm:gap-4">
          //fuel
          <div className="flex gap-2 sm:gap-3 items-center">
            <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-md border border-stone-700 group transition-colors hover:border-emerald-500/50">
              <Trees size={14} className="text-emerald-500" />
              <span className="font-mono text-sm min-w-[20px] text-center">{woodCount}</span>
            </div>
            <div className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-md border border-stone-700 group transition-colors hover:border-orange-500/50">
              <Flame size={14} className="text-orange-500" />
              <span className="font-mono text-sm min-w-[20px] text-center">{charcoalCount}</span>
            </div>
          </div>
        </div> */}
      </div>
    </header>
  );
};
