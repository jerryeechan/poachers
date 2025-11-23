import { Tile as TileType, Inventory, ItemType, ViewState, WeatherType } from '../types';
import { TILE_TYPES, GAME_CONFIG } from '../constants';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TileActionContext {
    tile: TileType;
    grid: TileType[];
    inventory: Inventory;
    energy: number;
    weather: WeatherType;
    viewState: ViewState;
    rescuedNPCs: { buff: 'stamina' | 'health' | 'attack' }[];
    maxTrainCapacity: number;
    selectedSlot: number | undefined;
}

export interface TileActionResult {
    canProceed: boolean;
    errorMessage?: string;
    cost: number;
}

export interface TileValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

// ============================================================================
// Cost Calculators (Strategy Pattern)
// ============================================================================

type CostCalculator = (tile: TileType, weather: WeatherType) => number;

const baseCostCalculator: CostCalculator = (tile, weather) => {
    return weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;
};

const searchCostCalculator: CostCalculator = (tile) => {
    const tileSearchCount = tile.searchCount || 0;
    return GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
};

const treeCostCalculator: CostCalculator = (tile) => {
    const tileSearchCount = tile.searchCount || 0;
    return GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
};

const enemyCostCalculator: CostCalculator = () => {
    return GAME_CONFIG.ACTIONS.ENEMY_COST;
};

const npcCostCalculator: CostCalculator = () => {
    return GAME_CONFIG.ACTIONS.COST_BASE;
};

const COST_CALCULATORS: Record<string, CostCalculator> = {
    search: searchCostCalculator,
    tree: treeCostCalculator,
    enemy: enemyCostCalculator,
    npc: npcCostCalculator,
};

/**
 * Calculate the stamina cost for interacting with a tile
 */
export function calculateTileCost(tile: TileType, weather: WeatherType): number {
    // Exploration cost is always base cost
    if (!tile.revealed && tile.peeked) {
        return GAME_CONFIG.ACTIONS.COST_BASE;
    }

    const calculator = COST_CALCULATORS[tile.type];
    return calculator ? calculator(tile, weather) : baseCostCalculator(tile, weather);
}

// ============================================================================
// Tile Validators (Strategy Pattern)
// ============================================================================

type TileValidator = (context: TileActionContext) => TileValidationResult;

const npcValidator: TileValidator = (context) => {
    const { grid, rescuedNPCs, maxTrainCapacity } = context;

    // Check if enemies are on the field
    const hasEnemies = grid.some(t => t.type === 'enemy' && t.revealed && !t.cleared);
    if (hasEnemies) {
        return {
            isValid: false,
            errorMessage: "Cannot rescue while enemies are present!"
        };
    }

    // Check train capacity
    if (rescuedNPCs.length >= maxTrainCapacity) {
        return {
            isValid: false,
            errorMessage: "Train is at full capacity!"
        };
    }

    return { isValid: true };
};

const brokenTrackValidator: TileValidator = (context) => {
    const { tile, inventory } = context;

    if (!tile.isBroken) {
        return { isValid: true };
    }

    const woodCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_WOOD;
    const stoneCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_STONE;

    const woodItem = inventory.find(i => i?.type === 'wood');
    const stoneItem = inventory.find(i => i?.type === 'stone');
    const woodCount = woodItem ? woodItem.count : 0;
    const stoneCount = stoneItem ? stoneItem.count : 0;

    if (woodCount < woodCost || stoneCount < stoneCost) {
        return {
            isValid: false,
            errorMessage: `Need ${woodCost} Wood and ${stoneCost} Stone to repair!`
        };
    }

    return { isValid: true };
};

const toolValidator: TileValidator = (context) => {
    const { tile, inventory, selectedSlot } = context;
    const config = TILE_TYPES[tile.type.toUpperCase()];

    // No tool required
    if (!config.tool || tile.type === 'enemy') {
        return { isValid: true };
    }

    const selectedItem = selectedSlot !== undefined ? inventory[selectedSlot] : null;

    // Check if selected item is the required tool
    let toolIndex = -1;
    if (selectedItem && selectedItem.type === config.tool) {
        toolIndex = selectedSlot!;
    } else {
        toolIndex = inventory.findIndex(item =>
            item?.type === config.tool && (item.durability === undefined || item.durability > 0)
        );
    }

    if (toolIndex === -1) {
        return {
            isValid: false,
            errorMessage: `Requires ${config.tool}!`
        };
    }

    return { isValid: true };
};

const TILE_VALIDATORS: Record<string, TileValidator[]> = {
    npc: [npcValidator, toolValidator],
    track: [brokenTrackValidator],
    tree: [toolValidator],
    rock: [toolValidator],
    enemy: [],
    search: [],
};

/**
 * Validate if a tile action can be performed
 */
export function validateTileAction(context: TileActionContext): TileValidationResult {
    // If exploring (peeked but not revealed), no specific validators needed (no tools, etc.)
    if (!context.tile.revealed && context.tile.peeked) {
        return { isValid: true };
    }

    const validators = TILE_VALIDATORS[context.tile.type] || [toolValidator];

    for (const validator of validators) {
        const result = validator(context);
        if (!result.isValid) {
            return result;
        }
    }

    return { isValid: true };
}

// ============================================================================
// Main Tile Click Handler
// ============================================================================

/**
 * Check if a tile can be clicked
 */
export function canClickTile(tile: TileType, viewState: ViewState): boolean {
    // Game over check
    if (viewState === 'gameover') {
        console.log("Game over");
        return false;
    }

    // Allow clicking peeked (unexplored) tiles
    if (!tile.revealed && tile.peeked) {
        console.log("Peeked tile clicked");
        return true;
    }

    // Basic tile state checks
    // if (!tile.revealed) {// || tile.type === 'void'
    //     return false;
    // }

    // Track tiles can only be clicked if broken
    if (tile.type === 'track' && !tile.isBroken) {
        console.log("Track tile clicked");
        return false;
    }

    // Cleared tiles can only be clicked in specific cases
    if (tile.cleared) {
        console.log("Cleared tile clicked");
        // Search tiles are now just empty, so they are NOT clickable when cleared
        // Only broken tracks are clickable when "cleared" (if we consider fixed tracks cleared? No, fixed tracks aren't cleared in that sense)
        // Actually, let's check the logic:
        // Old logic: const isSearchableSearch = tile.type === 'search' && tile.scavengeLeft > 0;
        // New logic: Search tiles are empty. ScavengeLeft > 0 applies to Trees only now.

        const isScavengeableTree = tile.type === 'tree' && tile.scavengeLeft > 0;
        const isBrokenTrack = tile.type === 'track' && tile.isBroken;

        if (!isScavengeableTree && !isBrokenTrack) {
            console.log("Cleared tile clicked");
            return false;
        }
    }

    console.log("Tile clicked");
    return true;
}

/**
 * Validate and calculate the cost for a tile action
 */
export function validateAndCalculateCost(context: TileActionContext): TileActionResult {
    const { tile, energy } = context;

    // Calculate cost
    const cost = calculateTileCost(tile, context.weather);

    // Check stamina
    if (energy < cost) {
        return {
            canProceed: false,
            errorMessage: "Exhausted! You need to Rest.",
            cost
        };
    }

    // Validate tile-specific requirements
    const validationResult = validateTileAction(context);
    if (!validationResult.isValid) {
        return {
            canProceed: false,
            errorMessage: validationResult.errorMessage,
            cost
        };
    }

    return {
        canProceed: true,
        cost
    };
}

/**
 * Find a tool in the inventory
 */
export function findToolIndex(
    inventory: Inventory,
    toolType: ItemType,
    selectedSlot: number | undefined
): number {
    const selectedItem = selectedSlot !== undefined ? inventory[selectedSlot] : null;

    // Check if selected item is the required tool
    if (selectedItem && selectedItem.type === toolType) {
        return selectedSlot!;
    }

    // Find any available tool
    return inventory.findIndex(item =>
        item?.type === toolType && (item.durability === undefined || item.durability > 0)
    );
}
