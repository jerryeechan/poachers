import React from 'react';
import { Inventory, ItemType } from '../types';
import { ITEM_CONFIG } from '../constants';
import { X } from 'lucide-react';

interface CargoModalProps {
    cargo: Inventory;
    onRetrieve: (index: number) => void;
    onClose: () => void;
}

export const CargoModal: React.FC<CargoModalProps> = ({ cargo, onRetrieve, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                    Cargo Storage
                </h2>

                <div className="grid grid-cols-5 gap-2 mb-6">
                    {cargo.map((item, index) => {
                        if (!item) {
                            return (
                                <div key={index} className="aspect-square bg-stone-950/50 rounded-lg border border-stone-800" />
                            );
                        }
                        const config = ITEM_CONFIG[item.type];
                        const Icon = config.icon;

                        return (
                            <button
                                key={index}
                                onClick={() => onRetrieve(index)}
                                className="aspect-square bg-stone-800 rounded-lg border border-stone-700 hover:border-amber-500/50 hover:bg-stone-700 transition-all group relative flex flex-col items-center justify-center"
                                title={`Click to retrieve ${config.name}`}
                            >
                                <Icon size={24} className="text-stone-300 group-hover:text-amber-400 mb-1" />
                                <span className="text-xs text-stone-400 font-mono">{item.count}</span>
                                {item.durability !== undefined && (
                                    <div className="absolute bottom-1 left-1 right-1 h-1 bg-stone-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-600"
                                            style={{ width: `${(item.durability / (item.maxDurability || 1)) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <p className="text-stone-500 text-sm text-center">
                    Click an item to retrieve it to your inventory.
                </p>
            </div>
        </div>
    );
};
