import React, { useMemo } from 'react';
import { Skull, RotateCcw, Trophy } from 'lucide-react';
import { GameStats } from '../types';
import { calculateFinalScore } from '../utils/scoring';

interface GameOverModalProps {
  stats: GameStats;
  gold: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, gold, onRestart }) => {
  const { totalScore, breakdown } = useMemo(() => calculateFinalScore(stats, gold), [stats, gold]);

  return (
    <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="max-w-lg w-full bg-stone-950 border-2 border-red-900 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.3)] p-8 relative overflow-hidden">
        
        <div className="absolute -top-10 -right-10 text-red-900/20 pointer-events-none">
          <Skull size={200} />
        </div>

        <div className="relative z-10 text-center mb-8">
          <h1 className="text-5xl font-black text-red-500 tracking-tighter mb-2 drop-shadow-lg uppercase">Game Over</h1>
          <p className="text-stone-400 font-mono text-sm">The forest has claimed another soul.</p>
        </div>

        <div className="bg-stone-900/80 rounded-xl p-6 border border-stone-800 mb-8 backdrop-blur-sm relative z-10">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-700/50">
             <Trophy className="text-yellow-500" size={24} />
             <span className="text-xl font-bold text-stone-200">Final Score</span>
             <span className="ml-auto text-3xl font-mono font-bold text-yellow-400">{totalScore.toLocaleString()}</span>
          </div>

          <div className="space-y-3 text-xs font-mono text-stone-400">
            {breakdown.map((item, index) => (
              <div key={index} className="flex justify-between items-center hover:bg-stone-800/50 p-1 rounded transition-colors">
                <span>{item.label} <span className="text-stone-600">x{item.value}</span></span>
                <span className="text-stone-300">+{ (item.value * item.multiplier).toLocaleString() }</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-red-900/50 transition-all transform hover:scale-105 relative z-10 group"
        >
          <RotateCcw className="group-hover:-rotate-180 transition-transform duration-500" />
          <span>Try Again</span>
        </button>

      </div>
    </div>
  );
};
