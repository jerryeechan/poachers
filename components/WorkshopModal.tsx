import React, { useRef, useEffect } from 'react';
import { Menu, Flame, Axe, Pickaxe, Sword, X } from 'lucide-react';
import { Inventory, ItemType } from '../types';
import { RECIPES, MAX_TOOL_DURABILITY } from '../constants';

interface WorkshopModalProps {
    inventory: Inventory;
    energy: number;
    onCraft: (key: string) => void;
    onClose: () => void;
}

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
    inventory,
    energy,
    onCraft,
    onClose
}) => {
    // Helper to get count
    const getCount = (type: string) => inventory.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);

    // Helper to find tool
    const findTool = (type: string) => inventory.find(item => item?.type === type);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="max-w-2xl w-full bg-stone-900 border-2 border-stone-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950">
                    <div className="flex items-center gap-2">
                        <Menu size={20} className="text-stone-500" />
                        <h3 className="text-sm font-bold text-stone-200 uppercase tracking-widest">Field Workshop</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-500 hover:text-stone-200 transition-colors p-1 hover:bg-stone-800 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {Object.entries(RECIPES).map(([key, recipe]) => {
                        const outputType = recipe.output.type;
                        const existingTool = findTool(outputType);
                        const toolDurability = existingTool?.durability || 0;
                        const staminaCost = recipe.staminaCost || 0;

                        // Check ingredients
                        const hasIngredients = recipe.input.every(req => getCount(req.type) >= req.count);
                        const hasEnergy = energy >= staminaCost;
                        const canCraft = hasIngredients && hasEnergy;

                        return (
                            <div key={key} className={`
                            bg-stone-950 p-4 rounded-lg border transition-all duration-200 group
                            ${toolDurability > 0 ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-stone-800 hover:border-stone-600'}
                        `}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 text-sm font-bold text-stone-200">
                                            {key === 'charcoal' ? <Flame size={16} className="text-orange-500" /> :
                                                key === 'axe' ? <Axe size={16} className="text-emerald-500" /> :
                                                    key === 'pickaxe' ? <Pickaxe size={16} className="text-stone-400" /> :
                                                        <Sword size={16} className="text-red-400" />}
                                            <span className="capitalize">{key}</span>
                                        </div>
                                        {staminaCost > 0 && (
                                            <span className={`text-[10px] ${hasEnergy ? 'text-stone-500' : 'text-red-500'}`}>
                                                -{staminaCost} Energy
                                            </span>
                                        )}
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
                                        {existingTool ? 'Repair' : 'Craft'}
                                    </button>
                                </div>

                                <div className="mt-2 flex gap-3 text-[10px] text-stone-500 font-mono flex-wrap">
                                    {recipe.input.map((req, i) => {
                                        const hasEnough = getCount(req.type) >= req.count;
                                        return (
                                            <span key={i} className={hasEnough ? 'text-emerald-500 font-bold' : 'text-red-500'}>
                                                {req.count} {req.type}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
