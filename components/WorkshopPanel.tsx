import React, { useRef, useEffect } from 'react';
import { Menu, Flame, Axe, Pickaxe, Sword } from 'lucide-react';
import { Resources, Tools, LogEntry } from '../types';
import { RECIPES, MAX_TOOL_DURABILITY } from '../constants';

interface WorkshopPanelProps {
  resources: Resources;
  tools: Tools;
  logs: LogEntry[];
  onCraft: (key: string) => void;
}

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({
  resources,
  tools,
  logs,
  onCraft
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <section className="lg:w-80 bg-stone-900 border-l border-stone-800 flex flex-col shrink-0 h-1/3 lg:h-auto z-20 shadow-2xl">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-800">
                <Menu size={16} className="text-stone-500"/>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Field Workshop</h3>
            </div>
            
            {Object.entries(RECIPES).map(([key, item]) => {
                const toolKey = item.output.tool;
                const toolDurability = toolKey ? tools[toolKey as keyof Tools] : 0;
                const hasWood = !item.input.wood || resources.wood >= item.input.wood;
                const hasStone = !item.input.stone || resources.stone >= item.input.stone;
                const canCraft = hasWood && hasStone;

                return (
                    <div key={key} className={`
                        bg-stone-950 p-3 rounded-lg border transition-all duration-200 group
                        ${toolDurability > 0 ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-stone-800 hover:border-stone-600'}
                    `}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-stone-200">
                                {key === 'charcoal' ? <Flame size={16} className="text-orange-500"/> : 
                                 key === 'axe' ? <Axe size={16} className="text-emerald-500"/> : 
                                 key === 'pickaxe' ? <Pickaxe size={16} className="text-stone-400"/> : 
                                 <Sword size={16} className="text-red-400"/>}
                                <span className="capitalize">{key}</span>
                            </div>
                            <button 
                                onClick={() => onCraft(key)}
                                disabled={!canCraft}
                                className={`
                                    text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-colors
                                    ${canCraft 
                                        ? 'bg-stone-700 hover:bg-stone-600 text-white' 
                                        : 'bg-stone-800 text-stone-600 cursor-not-allowed'}
                                `}
                            >
                                {item.output.tool && toolDurability > 0 ? 'Repair' : 'Craft'}
                            </button>
                        </div>
                        
                        {item.output.tool && (
                            <div className="w-full h-1.5 bg-stone-800 mt-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${toolDurability <= 1 ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-300`} 
                                    style={{ width: `${(toolDurability / MAX_TOOL_DURABILITY) * 100}%` }}
                                ></div>
                            </div>
                        )}
                        
                        <div className="mt-2 flex gap-3 text-[10px] text-stone-500 font-mono">
                            {item.input.wood && (
                                <span className={resources.wood >= item.input.wood ? 'text-emerald-500 font-bold' : 'text-red-500'}>
                                    {item.input.wood} Wood
                                </span>
                            )}
                            {item.input.stone && (
                                <span className={resources.stone >= item.input.stone ? 'text-emerald-500 font-bold' : 'text-red-500'}>
                                    {item.input.stone} Stone
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Game Logs */}
        <div className="h-40 lg:h-1/3 border-t border-stone-800 bg-black p-4 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar shadow-inner">
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
    </section>
  );
};
