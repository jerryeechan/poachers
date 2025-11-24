import React from 'react';
import { Flame, Train, Trees, X } from 'lucide-react';
import { Inventory, ViewState } from '../types';
import { GAME_CONFIG } from '../constants';

interface LocomotiveModalProps {
    pressure: number;
    targetPressure: number;
    inventory: Inventory;
    viewState: ViewState;
    onAddFuel: (type: 'wood' | 'charcoal') => void;
    onDepart: () => void;
    onClose: () => void;
}

export const LocomotiveModal: React.FC<LocomotiveModalProps> = ({
    pressure,
    targetPressure,
    inventory,
    viewState,
    onAddFuel,
    onDepart,
    onClose
}) => {
    // Helper to get count
    const getCount = (type: string) => inventory.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
    const woodCount = getCount('wood');
    const charcoalCount = getCount('charcoal');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                    <Train size={28} />
                    Locomotive Engine
                </h2>

                {/* Pressure Gauge */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-stone-500 tracking-wider">BOILER PRESSURE</span>
                        <span className="text-xl font-mono font-bold text-amber-500">
                            {pressure} <span className="text-stone-500 text-sm">/ {targetPressure} PSI</span>
                        </span>
                    </div>
                    <div className="h-6 bg-stone-950 rounded-full border border-stone-700 relative overflow-hidden">
                        {/* Tick marks */}
                        <div className="absolute inset-0 flex justify-between px-2">
                            {[...Array(5)].map((_, i) => <div key={i} className="h-full w-[1px] bg-stone-800/50 z-10" />)}
                        </div>
                        <div
                            className="h-full bg-gradient-to-r from-orange-900 via-orange-600 to-amber-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, (pressure / targetPressure) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Fuel Controls */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Wood */}
                    <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Trees size={20} />
                            <span className="font-bold">Wood</span>
                        </div>
                        <div className="text-stone-400 text-sm mb-2">Inventory: {woodCount}</div>
                        <button
                            onClick={() => onAddFuel('wood')}
                            disabled={woodCount <= 0 || pressure >= targetPressure}
                            className={`
                w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors
                ${woodCount > 0 && pressure < targetPressure
                                    ? 'bg-stone-700 hover:bg-stone-600 text-emerald-400 border border-stone-600'
                                    : 'bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-800'}
              `}
                        >
                            <Flame size={14} />
                            Add (+{GAME_CONFIG.TRAIN.FUEL_GAIN_WOOD})
                        </button>
                    </div>

                    {/* Charcoal */}
                    <div className="bg-stone-800 p-4 rounded-lg border border-stone-700 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                            <Flame size={20} />
                            <span className="font-bold">Charcoal</span>
                        </div>
                        <div className="text-stone-400 text-sm mb-2">Inventory: {charcoalCount}</div>
                        <button
                            onClick={() => onAddFuel('charcoal')}
                            disabled={charcoalCount <= 0 || pressure >= targetPressure}
                            className={`
                w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors
                ${charcoalCount > 0 && pressure < targetPressure
                                    ? 'bg-stone-700 hover:bg-stone-600 text-orange-400 border border-stone-600'
                                    : 'bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-800'}
              `}
                        >
                            <Flame size={14} />
                            Add (+{GAME_CONFIG.TRAIN.FUEL_GAIN_CHARCOAL})
                        </button>
                    </div>
                </div>

                {/* Depart Button */}
                <button
                    onClick={onDepart}
                    disabled={pressure < targetPressure || viewState === 'shop'}
                    className={`
            w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg
            ${pressure >= targetPressure && viewState !== 'shop'
                            ? 'bg-amber-500 text-stone-900 hover:bg-amber-400 hover:scale-[1.02] animate-pulse'
                            : 'bg-stone-800 text-stone-600 cursor-not-allowed grayscale'}
          `}
                >
                    <Train size={24} />
                    DEPART STATION
                </button>

                {pressure < targetPressure && (
                    <p className="text-center text-stone-500 text-xs mt-3">
                        Build pressure to {targetPressure} PSI to depart.
                    </p>
                )}
            </div>
        </div>
    );
};
