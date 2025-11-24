import { Inventory, ItemType } from '../types';
import { ITEM_CONFIG, MAX_TOOL_DURABILITY } from '../constants';

export const addToInventory = (currentInv: Inventory, type: ItemType, count: number, durability?: number): { newInv: Inventory, added: number } => {
    let remaining = count;
    const newInv = [...currentInv];
    const maxStack = ITEM_CONFIG[type].maxStack;

    // 1. Fill existing slots
    for (let i = 0; i < newInv.length; i++) {
        if (remaining <= 0) break;
        const item = newInv[i];
        if (item && item.type === type && item.count < maxStack) {
            const space = maxStack - item.count;
            const add = Math.min(remaining, space);
            newInv[i] = { ...item, count: item.count + add };
            remaining -= add;
        }
    }

    // 2. Fill empty slots
    for (let i = 0; i < newInv.length; i++) {
        if (remaining <= 0) break;
        if (newInv[i] === null) {
            const add = Math.min(remaining, maxStack);
            newInv[i] = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                count: add,
                durability: durability,
                maxDurability: durability ? MAX_TOOL_DURABILITY : undefined
            };
            remaining -= add;
        }
    }

    return { newInv, added: count - remaining };
};

export const removeFromInventory = (currentInv: Inventory, type: ItemType, count: number): { newInv: Inventory, success: boolean } => {
    // Check if we have enough first
    const total = currentInv.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
    if (total < count) return { newInv: currentInv, success: false };

    let remaining = count;
    const newInv = [...currentInv];

    // Remove from last slots first (optional preference)
    for (let i = newInv.length - 1; i >= 0; i--) {
        if (remaining <= 0) break;
        const item = newInv[i];
        if (item && item.type === type) {
            if (item.count > remaining) {
                newInv[i] = { ...item, count: item.count - remaining };
                remaining = 0;
            } else {
                remaining -= item.count;
                newInv[i] = null;
            }
        }
    }

    return { newInv, success: true };
};

export const hasResources = (inventory: Inventory, requirements: { type: ItemType; count: number }[]): boolean => {
    return requirements.every(req => {
        const count = inventory.reduce((acc, item) => (item?.type === req.type ? acc + item.count : acc), 0);
        return count >= req.count;
    });
};

export const consumeResources = (inventory: Inventory, requirements: { type: ItemType; count: number }[]): { newInv: Inventory, success: boolean } => {
    if (!hasResources(inventory, requirements)) {
        return { newInv: inventory, success: false };
    }

    let tempInv = [...inventory];
    for (const req of requirements) {
        const res = removeFromInventory(tempInv, req.type, req.count);
        if (!res.success) return { newInv: inventory, success: false };
        tempInv = res.newInv;
    }

    return { newInv: tempInv, success: true };
};

export const decreaseToolDurability = (currentInv: Inventory, slotIndex: number): { newInv: Inventory, broken: boolean, itemType?: ItemType } => {
    const newInv = [...currentInv];
    const item = newInv[slotIndex];
    let broken = false;
    let itemType = item?.type;

    if (item && item.durability !== undefined) {
        const newDurability = item.durability - 1;
        if (newDurability <= 0) {
            newInv[slotIndex] = null;
            broken = true;
        } else {
            newInv[slotIndex] = { ...item, durability: newDurability };
        }
    }
    return { newInv, broken, itemType };
};

export const consumeFromCombinedInventory = (
    primaryInv: Inventory,
    secondaryInv: Inventory,
    requirements: { type: ItemType; count: number }[]
): { newPrimary: Inventory, newSecondary: Inventory, success: boolean } => {
    // 1. Check total availability
    const checkTotal = (type: ItemType) => {
        const p = primaryInv.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
        const s = secondaryInv.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
        return p + s;
    };

    for (const req of requirements) {
        if (checkTotal(req.type) < req.count) {
            return { newPrimary: primaryInv, newSecondary: secondaryInv, success: false };
        }
    }

    // 2. Consume
    let tempPrimary = [...primaryInv];
    let tempSecondary = [...secondaryInv];

    for (const req of requirements) {
        let remaining = req.count;

        // Consume from Primary first
        for (let i = tempPrimary.length - 1; i >= 0; i--) {
            if (remaining <= 0) break;
            const item = tempPrimary[i];
            if (item && item.type === req.type) {
                if (item.count > remaining) {
                    tempPrimary[i] = { ...item, count: item.count - remaining };
                    remaining = 0;
                } else {
                    remaining -= item.count;
                    tempPrimary[i] = null;
                }
            }
        }

        // Consume remaining from Secondary
        if (remaining > 0) {
            for (let i = tempSecondary.length - 1; i >= 0; i--) {
                if (remaining <= 0) break;
                const item = tempSecondary[i];
                if (item && item.type === req.type) {
                    if (item.count > remaining) {
                        tempSecondary[i] = { ...item, count: item.count - remaining };
                        remaining = 0;
                    } else {
                        remaining -= item.count;
                        tempSecondary[i] = null;
                    }
                }
            }
        }
    }

    return { newPrimary: tempPrimary, newSecondary: tempSecondary, success: true };
};
