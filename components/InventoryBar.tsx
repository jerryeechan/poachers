import React from 'react';
import { Inventory, Item } from '../types';
import { ITEM_CONFIG, INVENTORY_SIZE } from '../constants';

interface InventoryBarProps {
    inventory: Inventory;
    selectedSlot?: number;
    onSlotClick?: (index: number) => void;
}

export const InventoryBar: React.FC<InventoryBarProps> = ({ inventory, selectedSlot, onSlotClick }) => {
    // Create an array of size INVENTORY_SIZE to map over
    const slots = Array.from({ length: INVENTORY_SIZE }, (_, i) => inventory[i] || null);

    return (
        <div className="flex items-center justify-center gap-1 p-2 bg-stone-900/90 border-t border-stone-800 backdrop-blur-sm">
            {slots.map((item, index) => (
                <InventorySlot
                    key={index}
                    item={item}
                    index={index}
                    isSelected={selectedSlot === index}
                    onClick={() => onSlotClick && onSlotClick(index)}
                />
            ))}
        </div>
    );
};

interface InventorySlotProps {
    item: Item | null;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

const InventorySlot: React.FC<InventorySlotProps> = ({ item, index, isSelected, onClick }) => {
    const config = item ? ITEM_CONFIG[item.type] : null;
    const Icon = config?.icon;

    return (
        <div
            className={`
        relative w-10 h-10 sm:w-12 sm:h-12 bg-stone-950 border-2 rounded-md flex items-center justify-center cursor-pointer transition-all
        ${isSelected ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-stone-700 hover:border-stone-500'}
      `}
            onClick={onClick}
        >
            {/* Slot Number (optional, like Minecraft 1-9) */}
            <span className="absolute top-0.5 left-1 text-[10px] text-stone-600 font-mono pointer-events-none">
                {index + 1 === 10 ? 0 : index + 1}
            </span>

            {item && Icon && (
                <>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-stone-200" />

                    {/* Count */}
                    {item.count > 1 && (
                        <span className="absolute bottom-0 right-1 text-xs font-bold text-white drop-shadow-md">
                            {item.count}
                        </span>
                    )}

                    {/* Durability Bar */}
                    {(item.durability !== undefined) && (
                        <div className="absolute bottom-1 left-1 right-1 h-1 bg-stone-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${(item.durability / (item.maxDurability || 5)) < 0.3 ? 'bg-red-500' :
                                        (item.durability / (item.maxDurability || 5)) < 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${(item.durability / (item.maxDurability || 5)) * 100}%` }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
