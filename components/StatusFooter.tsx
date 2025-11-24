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
    onNap: () => void;
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
    onNap,
    isExhausted,
    logs,
    onLogClick,
    onAvatarClick
}) => {
    // Get the last log entry
    const lastLog = logs && logs.length > 0 ? logs[0] : null;

    return (
        <div className="bg-stone-900 border-t border-stone-800 p-3 sm:p-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10">
            {/* Mobile Layout: Stack vertically */}
            <div className="flex flex-col gap-3 sm:hidden">
                {/* Row 1: Avatar + Stats */}
                <div className="flex gap-3 items-center">
                    <div
                        className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                        onClick={onAvatarClick}
                    >
                        <div className="text-4xl filter drop-shadow-lg transition-transform hover:scale-110">{avatar}</div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                        {/* HP */}
                        <div className="w-full">
                            <div className="flex justify-between text-[9px] mb-0.5 uppercase tracking-widest font-bold text-stone-500">
                                <span className="flex items-center gap-1 text-red-400"><Heart size={9} /> HP</span>
                                <span>{hp}/{maxHp}</span>
                            </div>
                            <div className="h-1.5 bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(hp / maxHp) * 100}%` }}></div>
                            </div>
                        </div>
                        {/* Energy */}
                        <div className="w-full">
                            <div className="flex justify-between text-[9px] mb-0.5 uppercase tracking-widest font-bold text-stone-500">
                                <span className="flex items-center gap-1 text-emerald-400"><Zap size={9} /> Stamina</span>
                                <span>{energy}/{maxEnergy}</span>
                            </div>
                            <div className="h-1.5 bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(energy / maxEnergy) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Attack Badge */}
                    <div className="flex-shrink-0 bg-stone-950/50 rounded px-2 py-1.5 border border-stone-800">
                        <div className="text-[9px] uppercase tracking-widest font-bold text-stone-500 flex items-center gap-1">
                            <Sword size={9} className="text-amber-500" />
                        </div>
                        <div className="text-xs font-bold text-amber-500 text-center">{attack}</div>
                    </div>
                </div>

                {/* Row 2: Game Log */}
                {lastLog && (
                    <button
                        onClick={onLogClick}
                        className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-2 py-1.5 hover:bg-stone-950 hover:border-stone-600 transition-all cursor-pointer group"
                        title="Click to view all logs"
                    >
                        <div className="flex items-center gap-2">
                            <ScrollText size={12} className="text-stone-500 group-hover:text-stone-400 transition-colors flex-shrink-0" />
                            <div className={`text-[10px] font-mono truncate ${lastLog.type === 'error' ? 'text-red-400' :
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

                {/* Row 3: Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onRest}
                        className={`flex-1 bg-indigo-900 hover:bg-indigo-800 text-white px-3 py-2 rounded-lg text-[10px] font-bold transition-all shadow-lg hover:shadow-indigo-900/50 flex items-center justify-center gap-1.5 border-b-2 border-indigo-950 active:border-b-0 active:translate-y-0.5 ${isExhausted ? 'animate-bounce ring-2 ring-red-500 shadow-red-500/50' : ''}`}
                        title="Sleep until morning (Full Restore, New Day)"
                    >
                        <Tent size={12} />
                        <span>SLEEP</span>
                    </button>
                    <button
                        onClick={onNap}
                        className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shadow flex items-center justify-center gap-1.5 border-b-2 border-stone-950 active:border-b-0 active:translate-y-0.5"
                        title="Take a short nap (+10 Stamina, +30 mins)"
                    >
                        <Zap size={12} className="text-yellow-500" />
                        <span>NAP</span>
                    </button>
                </div>
            </div>

            {/* Desktop Layout: Horizontal */}
            <div className="hidden sm:flex items-center justify-between gap-4">
                {/* Left: Avatar + Log */}
                <div className="flex flex-col gap-2">
                    <div
                        className="cursor-pointer active:scale-95 transition-transform"
                        onClick={onAvatarClick}
                    >
                        <div className="text-5xl filter drop-shadow-lg transition-transform hover:scale-110">{avatar}</div>
                    </div>

                    {/* Game Log below avatar */}
                    {lastLog && (
                        <button
                            onClick={onLogClick}
                            className="w-48 bg-stone-950/80 border border-stone-700 rounded-lg px-2 py-1.5 hover:bg-stone-950 hover:border-stone-600 transition-all cursor-pointer group"
                            title="Click to view all logs"
                        >
                            <div className="flex items-center gap-1.5">
                                <ScrollText size={12} className="text-stone-500 group-hover:text-stone-400 transition-colors flex-shrink-0" />
                                <div className={`text-[10px] font-mono truncate ${lastLog.type === 'error' ? 'text-red-400' :
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
                </div>

                {/* Center: Stats */}
                <div className="flex flex-col gap-3 w-56">
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

                {/* Right: Action Buttons */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onRest}
                        className={`bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-[10px] font-bold transition-all shadow-lg hover:shadow-indigo-900/50 flex items-center justify-center gap-2 border-b-2 border-indigo-950 active:border-b-0 active:translate-y-0.5 ${isExhausted ? 'animate-bounce ring-2 ring-red-500 shadow-red-500/50' : ''}`}
                        title="Sleep until morning (Full Restore, New Day)"
                    >
                        <Tent size={14} />
                        <span>SLEEP</span>
                    </button>
                    <button
                        onClick={onNap}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 rounded-lg text-[10px] font-bold transition-all shadow flex items-center justify-center gap-2 border-b-2 border-stone-950 active:border-b-0 active:translate-y-0.5"
                        title="Take a short nap (+10 Stamina, +30 mins)"
                    >
                        <Zap size={14} className="text-yellow-500" />
                        <span>NAP</span>
                    </button>
                </div>
            </div>
        </div >
    );
};
