import React from 'react';
import { Tile as TileType } from '../types';
import { X } from 'lucide-react';

interface DebugPanelProps {
    tile: TileType | null;
    onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ tile, onClose }) => {
    if (!tile) {
        return (
            <div className="fixed top-4 left-4 bg-black/90 backdrop-blur-md text-green-400 font-mono text-xs p-4 rounded-lg border border-green-500/30 shadow-2xl z-50 max-w-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-green-300 font-bold">🐛 Debug Panel</div>
                    <button
                        onClick={onClose}
                        className="text-green-500 hover:text-green-300 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="text-green-500/50">No tile clicked yet. Click a tile to see its state.</div>
                <div className="text-green-600/40 text-[10px] mt-2">Press ` to toggle</div>
            </div>
        );
    }

    // Format the tile object for display
    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `[${value.length} items]`;
        if (typeof value === 'object') return '{...}';
        return String(value);
    };

    // Get all properties of the tile
    const tileEntries = Object.entries(tile).sort((a, b) => a[0].localeCompare(b[0]));

    return (
        <div className="fixed top-4 left-4 bg-black/95 backdrop-blur-md text-green-400 font-mono text-xs p-4 rounded-lg border border-green-500/30 shadow-2xl z-50 max-w-md max-h-[80vh] overflow-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-black/95 pb-2">
                <div className="text-green-300 font-bold">🐛 Debug Panel - Last Clicked Tile</div>
                <button
                    onClick={onClose}
                    className="text-green-500 hover:text-green-300 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-1">
                {tileEntries.map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                        <span className="text-cyan-400 min-w-[120px]">{key}:</span>
                        <span className="text-green-300 break-all">{formatValue(value)}</span>
                    </div>
                ))}
            </div>

            <div className="text-green-600/40 text-[10px] mt-3 pt-2 border-t border-green-900/30">
                Press ` to toggle • Click any tile to update
            </div>
        </div>
    );
};
