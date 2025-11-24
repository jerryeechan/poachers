import React from 'react';
import { Heart, Zap, Tent, Sword, ScrollText } from 'lucide-react';
import { LogEntry } from '../types';

interface StatusFooterProps {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    currentLoad: number;
    maxCapacity: number;
    avatar: string;
    attack: number;
    isExhausted?: boolean;
    onRest: () => void;
    logs?: LogEntry[];
    onLogClick?: () => void;
    onAvatarClick?: () => void;
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
    hp,
    maxHp,
    energy,
    maxEnergy,
    currentLoad,
    maxCapacity,
    avatar,
    attack,
    onRest,
    isExhausted,
    logs,
    onLogClick,
    onAvatarClick
}) => {
    // Get the last log entry
    const lastLog = logs && logs.length > 0 ? logs[0] : null;

    return (
        <div className="bg-stone-900 border-t border-stone-800 p-4 flex items-center justify-between gap-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10">
            <div className="flex gap-6 items-center">
                <div
                    className="flex flex-col items-center justify-center -mt-2 cursor-pointer active:scale-95 transition-transform"
                    onClick={onAvatarClick}
                >
                    <div className="text-5xl filter drop-shadow-lg transition-transform hover:scale-110">{avatar}</div>
                </div>

                <div className="flex flex-col gap-3 w-40 sm:w-56">
                    {/* HP */}
                    <div className="w-full">
                        <div className="flex justify-between text-[10px] mb-1 uppercase tracking-widest font-bold text-stone-500">
                            <span className="flex items-center gap-1 text-red-400"><Heart size={10} /> health</span>
                            <span>{hp}/{maxHp}</span>
                        </div>
                        <div className="h-2 bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(hp / maxHp) * 100}%` }}></div>
                        </div>
                    </div>
                    {/* Energy */}
                    <div className="w-full">
                        <div className="flex justify-between text-[10px] mb-1 uppercase tracking-widest font-bold text-stone-500">
                            <span className="flex items-center gap-1 text-emerald-400"><Zap size={10} /> Stamina</span>
                            <span>{energy}/{maxEnergy}</span>
                        </div>
                        <div className="h-2 bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(energy / maxEnergy) * 100}%` }}></div>
                        </div>
                    </div>
                    {/* Attack */}
                    <div className="w-full flex justify-between items-center bg-stone-950/50 rounded px-2 py-1 border border-stone-800">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 flex items-center gap-1">
                            <Sword size={10} className="text-amber-500" /> Attack
                        </span>
                        <span className="text-xs font-bold text-amber-500">{attack}</span>
                    </div>
                </div>
            </div>

            {/* Last Log Entry */}
            {lastLog && (
                <button
                    onClick={onLogClick}
                    className="flex-1 max-w-md bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2 hover:bg-stone-950 hover:border-stone-600 transition-all cursor-pointer group"
                    title="Click to view all logs"
                >
                    <div className="flex items-center gap-2">
                        <ScrollText size={14} className="text-stone-500 group-hover:text-stone-400 transition-colors flex-shrink-0" />
                        <div className={`text-xs font-mono truncate ${lastLog.type === 'error' ? 'text-red-400' :
                            lastLog.type === 'success' ? 'text-emerald-400' :
                                lastLog.type === 'important' ? 'text-amber-400' :
                                    lastLog.type === 'warning' ? 'text-orange-300' :
                                        'text-stone-400'
                            }`}>
                            {lastLog.text}
                        </div>
                    </div>
                </button>
            )}

            <button
                onClick={onRest}
                className={`bg-blue-700 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-900/50 flex flex-col items-center gap-1 min-w-[80px] border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 ${isExhausted ? 'animate-bounce ring-2 ring-red-500 shadow-red-500/50' : ''}`}
            >
                <Tent size={20} />
                <span>REST</span>
            </button>
        </div >
    );
};
