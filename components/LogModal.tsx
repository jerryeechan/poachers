import React, { useRef, useEffect } from 'react';
import { ScrollText, X } from 'lucide-react';
import { LogEntry } from '../types';

interface LogModalProps {
    logs: LogEntry[];
    onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ logs, onClose }) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="max-w-3xl w-full bg-stone-900 border-2 border-stone-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950">
                    <div className="flex items-center gap-2">
                        <ScrollText size={20} className="text-stone-500" />
                        <h3 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Game Logs</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-500 hover:text-stone-200 transition-colors p-1 hover:bg-stone-800 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-1.5 custom-scrollbar bg-black">
                    {logs.length === 0 && <div className="text-stone-700 italic">System ready. Awaiting input...</div>}
                    {[...logs].reverse().map((log, i, arr) => {
                        const isNewest = i === arr.length - 1;
                        return (
                            <div key={log.id} className={`
                            transition-all duration-300
                            ${log.type === 'error' ? 'text-red-400 font-bold' :
                                    log.type === 'success' ? 'text-emerald-400' :
                                        log.type === 'important' ? 'text-amber-400 border-l-2 border-amber-500 pl-2' :
                                            log.type === 'warning' ? 'text-orange-300' :
                                                'text-stone-500'}
                            ${isNewest ? 'opacity-100 bg-white/5 -mx-2 px-2 py-0.5 rounded' : 'opacity-60'}
                        `}>
                                <span className={`mr-2 select-none ${isNewest ? 'opacity-100' : 'opacity-30'}`}>›</span>
                                {log.text}
                            </div>
                        );
                    })}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
