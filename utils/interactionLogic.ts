import { Tile as TileType, Inventory, ItemType, LogEntry, GameStats } from '../types';
import { GAME_CONFIG, ITEM_CONFIG } from '../constants';
import { calculateEnemyLevel } from './gameplay';

export interface InteractionResult {
    updatedGrid: TileType[];
    inventoryChanges: { type: ItemType; count: number }[]; // Positive for add, negative for remove
    hpChange: number;
    goldChange: number;
    statsUpdate: Partial<GameStats>;
    logs: { text: string; type: LogEntry['type'] }[];
    rescuedNPC?: { buff: 'stamina' | 'health' | 'attack' };
    toolDurabilityIndex?: number;
}

/**
 * Handles logic when a tile is fully explored (revealed).
 */
export const processExplorationReveal = (
    tile: TileType,
    grid: TileType[]
): {
    updatedTile: TileType;
    loot: { type: ItemType; count: number }[];
    logs: { text: string; type: LogEntry['type'] }[];
} => {
    const updatedTile = { ...tile, revealed: true, effect: 'pop' as const };
    const loot: { type: ItemType; count: number }[] = [];
    const logs: { text: string; type: LogEntry['type'] }[] = [];

    // 1. Fixed Rewards (Tree/Rock)
    const rewardConfig = GAME_CONFIG.EXPLORATION.REWARD[tile.type.toUpperCase() as keyof typeof GAME_CONFIG.EXPLORATION.REWARD];
    if (rewardConfig) {
        loot.push(rewardConfig);
        logs.push({ text: `Explored and found ${rewardConfig.count} ${rewardConfig.type}!`, type: 'success' });
    }

    // 2. Search Tile Rewards (Berries)
    if (tile.type === 'search') {
        if (Math.random() < GAME_CONFIG.MAP.LOOT.BERRY_CHANCE) {
            const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.BERRY_VAR) + GAME_CONFIG.MAP.LOOT.BERRY_MIN;
            loot.push({ type: 'berry', count: amount });
            logs.push({ text: `Found Wild Berries (+${amount})`, type: 'success' });
        } else {
            logs.push({ text: "Area explored.", type: 'neutral' });
        }
        updatedTile.cleared = true; // Auto-clear search tiles after reveal
    } else if (!rewardConfig && tile.type !== 'enemy' && tile.type !== 'npc') {
        logs.push({ text: "Area explored.", type: 'neutral' });
    }

    return { updatedTile, loot, logs };
};

/**
 * Handles combat logic.
 */
export const processCombat = (
    tile: TileType,
    inventory: Inventory,
    selectedSlot: number | undefined,
    buffedAttack: number,
    station: number,
    san: number
): {
    updatedTile: TileType;
    hpChange: number;
    goldChange: number;
    loot: { type: ItemType; count: number }[];
    logs: { text: string; type: LogEntry['type'] }[];
    statsUpdate: Partial<GameStats>;
    toolDurabilityIndex?: number;
} => {
    const selectedItem = selectedSlot !== undefined ? inventory[selectedSlot] : null;
    const isUsingBow = selectedItem?.type === 'bow';
    const playerDmg = isUsingBow ? GAME_CONFIG.ACTIONS.BOW_DMG : buffedAttack;
    const enemyDmg = tile.attack;

    let hpChange = 0;
    let goldChange = 0;
    const loot: { type: ItemType; count: number }[] = [];
    const logs: { text: string; type: LogEntry['type'] }[] = [];
    const statsUpdate: Partial<GameStats> = {};
    let toolDurabilityIndex: number | undefined = undefined;

    const updatedTile = { ...tile };
    updatedTile.hp = (updatedTile.hp || 0) - playerDmg;

    if ((updatedTile.hp || 0) <= 0) {
        // Enemy Defeated
        updatedTile.cleared = true;
        updatedTile.type = 'search';
        updatedTile.effect = 'pop';

        let dropMsg = `Enemy Defeated!`;
        statsUpdate.enemiesDefeated = 1;

        // Loot
        const woodAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_MIN;
        const stoneAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_MIN;
        if (woodAmt > 0) loot.push({ type: 'wood', count: woodAmt });
        if (stoneAmt > 0) loot.push({ type: 'stone', count: stoneAmt });

        // Gold
        const goldAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_GOLD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_GOLD_MIN;
        if (goldAmt > 0) {
            goldChange = goldAmt;
            dropMsg += ` (+${goldAmt} G)`;
        }

        // Key
        const level = calculateEnemyLevel(station, san);
        const keyChance = GAME_CONFIG.MAP.ENEMIES.LOOT_KEY_CHANCE_BASE + (level * GAME_CONFIG.MAP.ENEMIES.LOOT_KEY_CHANCE_LEVEL_MULT);
        if (Math.random() < keyChance) {
            loot.push({ type: 'key', count: 1 });
            dropMsg += ` (Found Key!)`;
        }

        logs.push({ text: dropMsg, type: 'success' });

        if (isUsingBow) {
            logs.push({ text: "Sniper Shot! Took no damage.", type: 'success' });
            toolDurabilityIndex = selectedSlot;
        } else {
            hpChange = -enemyDmg;
            logs.push({ text: `Took ${enemyDmg} damage!`, type: 'warning' });
        }
    } else {
        // Enemy Survived
        hpChange = -enemyDmg;
        logs.push({ text: `Hit enemy for ${playerDmg}. Took ${enemyDmg} damage!`, type: 'warning' });
        if (isUsingBow) {
            toolDurabilityIndex = selectedSlot;
        }
    }

    return { updatedTile, hpChange, goldChange, loot, logs, statsUpdate, toolDurabilityIndex };
};

/**
 * Handles resource gathering (Tree/Rock) and NPC rescue.
 */
export const processInteraction = (
    tile: TileType,
    inventory: Inventory,
    selectedSlot: number | undefined
): {
    updatedTile: TileType;
    loot: { type: ItemType; count: number }[];
    logs: { text: string; type: LogEntry['type'] }[];
    rescuedNPC?: { buff: 'stamina' | 'health' | 'attack' };
} => {
    const updatedTile = { ...tile };
    const loot: { type: ItemType; count: number }[] = [];
    const logs: { text: string; type: LogEntry['type'] }[] = [];
    let rescuedNPC: { buff: 'stamina' | 'health' | 'attack' } | undefined;

    if (tile.type === 'tree') {
        const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
        loot.push({ type: 'wood', count: amount });
        updatedTile.scavengeLeft = (updatedTile.scavengeLeft || 0) - 1;
        updatedTile.searchCount = (updatedTile.searchCount || 0) + 1;
        updatedTile.effect = 'pop';
        logs.push({ text: `Logging (+${amount} Wood)`, type: 'success' });

        if (updatedTile.scavengeLeft <= 0) {
            updatedTile.cleared = true;
            updatedTile.type = 'search';
        }
    } else if (tile.type === 'rock') {
        const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.ROCK_VAR) + GAME_CONFIG.MAP.LOOT.ROCK_MIN;
        loot.push({ type: 'stone', count: amount });
        logs.push({ text: `Mining (+${amount} Stone)`, type: 'success' });
        updatedTile.cleared = true;
        updatedTile.type = 'search';
        updatedTile.effect = 'pop';
    } else if (tile.type === 'npc') {
        updatedTile.rescueProgress = (updatedTile.rescueProgress || 0) - 1;
        updatedTile.effect = 'pop';

        if (updatedTile.rescueProgress <= 0) {
            updatedTile.cleared = true;
            updatedTile.type = 'search';

            const buff = updatedTile.npcBuff || 'stamina';
            rescuedNPC = { buff };

            const buffNames = {
                'stamina': 'Max Stamina',
                'health': 'Max HP',
                'attack': 'Attack Power'
            };
            logs.push({ text: `NPC Rescued! Gained ${buffNames[buff]} buff!`, type: 'success' });
        } else {
            logs.push({ text: `Rescuing... ${updatedTile.rescueProgress} turns left`, type: 'neutral' });
        }
    }

    return { updatedTile, loot, logs, rescuedNPC };
};

/**
 * Handles item consumption logic (e.g. eating berries).
 */
export const processItemConsumption = (
    item: { type: ItemType; count: number } | null,
    hp: number,
    maxHp: number,
    energy: number,
    maxEnergy: number
): {
    success: boolean;
    hpChange: number;
    energyChange: number;
    logs: { text: string; type: LogEntry['type'] }[];
} => {
    if (!item) return { success: false, hpChange: 0, energyChange: 0, logs: [] };

    if (item.type === 'berry') {
        const heal = GAME_CONFIG.ITEMS.BERRY.HEAL;
        const energyRestore = GAME_CONFIG.ITEMS.BERRY.ENERGY;

        if (hp >= maxHp && energy >= maxEnergy) {
            return {
                success: false,
                hpChange: 0,
                energyChange: 0,
                logs: [{ text: "Full health and energy!", type: 'neutral' }]
            };
        }

        return {
            success: true,
            hpChange: Math.min(heal, maxHp - hp), // Actually we just add, capping is done in state setter usually, but here we return delta. 
            // Wait, returning delta is safer. But we need to know how much to add.
            // Let's return the amounts to ADD.
            energyChange: energyRestore,
            logs: [{ text: "Ate a berry. Yummy!", type: 'success' }]
        };
    }

    return { success: false, hpChange: 0, energyChange: 0, logs: [] };
};
