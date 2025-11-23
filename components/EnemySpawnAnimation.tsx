import React, { useState, useEffect } from 'react';
import { Skull, AlertTriangle } from 'lucide-react';

interface EnemySpawnAnimationProps {
    enemySpawnRate: number; // Percentage (e.g., 150.5)
    spawnResults: boolean[]; // Pre-determined results for each bar
    onComplete: (spawnedCount: number) => void;
}

export const EnemySpawnAnimation: React.FC<EnemySpawnAnimationProps> = ({
    enemySpawnRate,
    spawnResults,
    onComplete
}) => {
    const barCount = Math.ceil(enemySpawnRate / 100);
    const [currentBar, setCurrentBar] = useState(0);
    const [barProgress, setBarProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(true);
    const [results, setResults] = useState<boolean[]>([]);
    const [finalPositions, setFinalPositions] = useState<number[]>([]);
    const [finalProgress, setFinalProgress] = useState<number | null>(null);

    useEffect(() => {
        if (currentBar >= barCount) {
            // Animation complete
            setTimeout(() => {
                const spawnedCount = results.filter(r => r).length;
                onComplete(spawnedCount);
            }, 1500);
            return;
        }

        if (!isAnimating) return;

        // Animate progress bar moving left and right
        const animationDuration = 2000; // 2 seconds of animation
        const startTime = Date.now();

        let animationFrameId: number;

        const animate = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed < animationDuration) {
                // Linear ping-pong: 0 -> 100 -> 0
                // Cycle duration: 1000ms (0.5s up, 0.5s down) for faster tension? 
                // Let's do 1000ms full cycle (0->100->0)
                const cycleTime = 600;
                const cyclePos = (elapsed % cycleTime) / cycleTime; // 0 to 1

                let val;
                if (cyclePos < 0.5) {
                    // Going up: 0 -> 0.5 maps to 0 -> 100
                    val = cyclePos * 2 * 100;
                } else {
                    // Going down: 0.5 -> 1.0 maps to 100 -> 0
                    val = (1 - cyclePos) * 2 * 100;
                }

                setBarProgress(val);
                animationFrameId = requestAnimationFrame(animate);
            } else {
                // Stop animation and determine final position based on PRE-DETERMINED result
                // Calculate threshold for THIS bar.
                // If it's a guaranteed bar (index < barCount - 1), threshold is effectively 100 (or 0 if we consider it fully covered).
                // Actually, for visualization:
                // If guaranteed, we want it to land in the "success" zone.
                // If probabilistic, threshold is (enemySpawnRate % 100).

                // Re-calculate threshold based on remaining rate logic
                // We can infer the threshold from the rate and index
                // rate = 250. index 0: threshold 100. index 1: threshold 100. index 2: threshold 50.
                let barThreshold = 100;
                const remainingForThisBar = enemySpawnRate - (currentBar * 100);
                if (remainingForThisBar < 100) {
                    barThreshold = remainingForThisBar;
                }

                const shouldSpawn = spawnResults[currentBar];

                // Calculate a visual position that matches the result
                let finalPos;
                if (shouldSpawn) {
                    // Result is SUCCESS (Spawn).
                    // Visual logic: Bar must land WITHIN the "danger" zone.
                    // If threshold is 30% (chance to spawn), does "within" mean < 30 or > 30?
                    // Typically "roll < threshold" is success.
                    // So if bar lands on 10, and threshold is 30, that's a spawn.
                    // So finalPos should be < barThreshold.

                    // Handle guaranteed bars (threshold 100): any value 0-99 works.
                    finalPos = Math.random() * (barThreshold - 0.1);
                } else {
                    // Result is FAIL (No Spawn).
                    // Final pos should be > barThreshold.
                    finalPos = barThreshold + (Math.random() * (100 - barThreshold));
                }

                // Clamp just in case
                finalPos = Math.max(0, Math.min(100, finalPos));

                setBarProgress(finalPos);
                setFinalProgress(finalPos);
                setIsAnimating(false);

                // Record result
                setResults(prev => [...prev, shouldSpawn]);
                setFinalPositions(prev => [...prev, finalPos]);

                // Move to next bar after showing result
                setTimeout(() => {
                    setCurrentBar(prev => prev + 1);
                    setBarProgress(0);
                    setFinalProgress(null);
                    setIsAnimating(true);
                }, 1000);
            }
        };

        animate();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [currentBar, isAnimating, barCount, enemySpawnRate, spawnResults]);

    return (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
                <h2 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-3 pb-4 border-b border-stone-800">
                    <AlertTriangle className="animate-pulse" size={28} />
                    Enemy Spawn Check
                </h2>

                <div className="mb-6 text-center">
                    <div className="text-sm text-stone-400 mb-2">Enemy Spawn Rate</div>
                    <div className="text-3xl font-bold text-red-500">{enemySpawnRate.toFixed(1)}%</div>
                </div>

                <div className="space-y-6">
                    {Array.from({ length: barCount }).map((_, index) => {
                        const isActive = index === currentBar;
                        const isComplete = index < currentBar;

                        // Calculate threshold for this specific bar
                        const remainingForThisBar = enemySpawnRate - (index * 100);
                        const threshold = remainingForThisBar >= 100 ? 100 : remainingForThisBar;

                        const spawned = results[index];

                        return (
                            <div key={index} className="space-y-2">
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-stone-400">
                                        Check #{index + 1} {isComplete && (spawned ? '✓ SPAWNED' : '✗ SAFE')}
                                    </span>
                                    <span className={`font-bold ${isComplete
                                        ? spawned ? 'text-red-500' : 'text-green-500'
                                        : 'text-stone-500'
                                        }`}>
                                        {isActive ? `${barProgress.toFixed(0)}%` : isComplete ? `${results[index] ? 'Enemy!' : 'Clear'}` : 'Pending'}
                                    </span>
                                </div>

                                <div className="relative h-8 bg-stone-950 rounded-lg border border-stone-700 overflow-hidden">
                                    {/* Threshold marker */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10"
                                        style={{ left: `${threshold}%` }}
                                    >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] text-yellow-500 font-bold whitespace-nowrap">
                                            {threshold.toFixed(0)}%
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {(isActive || isComplete) && (
                                        <div
                                            className={`h-full transition-all duration-100 ${isComplete
                                                ? spawned
                                                    ? 'bg-red-600'
                                                    : 'bg-green-600'
                                                : isAnimating
                                                    ? 'bg-blue-500'
                                                    : barProgress < threshold
                                                        ? 'bg-green-600'
                                                        : 'bg-red-600'
                                                }`}
                                            style={{ width: `${isActive ? barProgress : (isComplete ? finalPositions[index] : 0)}%` }}
                                        />
                                    )}

                                    {/* Result icon */}
                                    {isComplete && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {spawned ? (
                                                <Skull className="text-white drop-shadow-lg" size={20} />
                                            ) : (
                                                <span className="text-white font-bold text-lg drop-shadow-lg">✓</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {currentBar >= barCount && (
                    <div className="mt-6 text-center">
                        <div className="text-lg font-bold text-stone-300">
                            {results.filter(r => r).length > 0
                                ? `${results.filter(r => r).length} Enemy(ies) Spawned!`
                                : 'No Enemies Spawned'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
