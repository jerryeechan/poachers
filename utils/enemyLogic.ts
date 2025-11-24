import { Tile as TileType, LogEntry } from '../types';
import { GAME_CONFIG } from '../constants';

/**
 * Updates enemy attack progress based on time passed (minutes).
 * Returns updated grid, total damage taken, and logs.
 */
export const updateEnemyAttackProgress = (
    grid: TileType[],
    minutesPassed: number
): { updatedGrid: TileType[]; damage: number; logs: LogEntry[] } => {
    let totalDamage = 0;
    const logs: LogEntry[] = [];
    let gridChanged = false;

    const updatedGrid = grid.map(tile => {
        if (tile.type === 'enemy' && tile.revealed && !tile.cleared) {
            const currentProgress = tile.attackProgress || 0;
            const maxProgress = tile.maxAttackProgress || GAME_CONFIG.MAP.ENEMIES.PASSIVE_ATTACK_INTERVAL;

            let newProgress = currentProgress + minutesPassed;
            let tileDamage = 0;

            // Check if attack triggers
            if (newProgress >= maxProgress) {
                // Attack!
                tileDamage = tile.attack;
                totalDamage += tileDamage;

                logs.push({
                    id: Date.now() + Math.random(),
                    text: `Enemy at (${tile.x}, ${tile.y}) attacked! (-${tileDamage} HP)`,
                    type: 'warning'
                });

                // Reset progress, keeping overflow? Or just 0?
                // Let's keep overflow for fairness, or just modulo.
                newProgress = newProgress % maxProgress;

                return {
                    ...tile,
                    attackProgress: newProgress,
                    effect: 'flash' as const
                };
            }

            return {
                ...tile,
                attackProgress: newProgress
            };
        }
        return tile;
    });

    return { updatedGrid, damage: totalDamage, logs };
};
