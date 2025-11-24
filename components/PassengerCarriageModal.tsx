import React from 'react';
import { User, X, Zap, Heart, Swords, Users } from 'lucide-react';
import { NPCData, BuffType } from '../types';

interface PassengerCarriageModalProps {
    rescuedNPCs: NPCData[];
    onClose: () => void;
}

export const PassengerCarriageModal: React.FC<PassengerCarriageModalProps> = ({
    rescuedNPCs,
    onClose
}) => {
    const buffIcons: Record<BuffType, any> = {
        'stamina': Zap,
        'health': Heart,
        'attack': Swords
    };

    const buffColors: Record<BuffType, string> = {
        'stamina': 'text-yellow-400',
        'health': 'text-red-400',
        'attack': 'text-blue-400'
    };

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
                    <Users size={28} />
                    Passenger Carriage
                </h2>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {rescuedNPCs.length === 0 ? (
                        <div className="text-center text-stone-500 py-8 italic">
                            No passengers on board yet.
                        </div>
                    ) : (
                        rescuedNPCs.map((npc) => {
                            const BuffIcon = buffIcons[npc.buff];
                            return (
                                <div key={npc.id} className="bg-stone-800 p-3 rounded-lg border border-stone-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-stone-700 rounded-full flex items-center justify-center text-stone-400">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-200">{npc.name}</div>
                                            <div className="text-xs text-stone-500 uppercase tracking-wider">{npc.status}</div>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-1.5 ${buffColors[npc.buff]} bg-stone-900/50 px-2 py-1 rounded-md border border-stone-700/50`}>
                                        <BuffIcon size={14} />
                                        <span className="text-xs font-bold uppercase">{npc.buff}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-stone-800 text-center text-stone-500 text-xs">
                    Passengers provide passive bonuses to the train crew.
                </div>
            </div>
        </div>
    );
};
