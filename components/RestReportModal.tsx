import React from 'react';
import { Tent, Skull } from 'lucide-react';
import { RestReport } from '../types';

interface RestReportModalProps {
  report: RestReport;
  onClose: () => void;
}

export const RestReportModal: React.FC<RestReportModalProps> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in duration-300">
        <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-3 pb-4 border-b border-stone-800">
          <Tent className="animate-pulse" /> Camp Report
        </h2>

        <div className="space-y-4 text-sm font-mono">
          <div className="flex justify-between items-center p-2 bg-stone-950/50 rounded border border-stone-800/50">
            <span className="text-stone-400">Vitality Restored</span>
            <span className="text-emerald-400 font-bold">HP +{report.heal}</span>
          </div>

          <div className="flex justify-between items-center p-2 bg-stone-950/50 rounded border border-stone-800/50">
             <span className="text-stone-400">Boiler Pressure</span>
             <span className="text-orange-400 font-bold">-{report.pressureLoss} PSI</span>
          </div>

          {report.enemiesCount > 0 ? (
            <div className="flex justify-between items-center p-2 bg-red-950/20 rounded border border-red-900/30">
              <span className="text-red-300">Night Raid ({report.enemiesCount} enemies)</span>
              <span className="font-bold text-red-500">-{report.dmg} HP</span>
            </div>
          ) : (
            <div className="text-stone-500 italic text-center py-2">The night was quiet...</div>
          )}

          {report.ambush && (
            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded text-red-400 text-xs flex items-center gap-3">
              <Skull size={20} />
              <div>
                <div className="font-bold">AMBUSH DETECTED</div>
                <div>A cleared area has been overrun.</div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 bg-stone-800 hover:bg-stone-700 text-stone-200 py-3 rounded border border-stone-600 font-bold transition-colors"
        >
          Break Camp
        </button>
      </div>
    </div>
  );
};