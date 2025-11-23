
import React, { useState, useEffect, useCallback } from 'react';
import {
  GRID_SIZE, MAX_ENERGY, MAX_HP, MAX_TOOL_DURABILITY,
  BASE_CAPACITY, CARRIAGE_CAPACITY_BONUS, RECIPES, TILE_TYPES,
  GAME_CONFIG, ITEM_CONFIG, INVENTORY_SIZE
} from './constants';

import {
  Inventory, Item, ItemType, Tile as TileType, ViewState,
  RestReport, WeatherType, LogEntry, GameStats
} from './types';

import { Tile } from './components/Tile';
import { ShopOverlay } from './components/ShopOverlay';
import { RestReportModal } from './components/RestReportModal';
import { GameOverModal } from './components/GameOverModal';
import { EnemySpawnAnimation } from './components/EnemySpawnAnimation'; // Kept but unused
import { DiceSpawnAnimation } from './components/DiceSpawnAnimation';
import { Header } from './components/Header';
import { StatusFooter } from './components/StatusFooter';
import { WorkshopModal } from './components/WorkshopModal';
import { LogModal } from './components/LogModal';
import { InventoryBar } from './components/InventoryBar';

// Utilities
import { generateLevel, revealNeighbors, updatePeekStatus } from './utils/map';
import { getAvatarFace, calculateRestOutcome, calculateEnemyLevel } from './utils/gameplay';
import { canClickTile, validateAndCalculateCost, findToolIndex, calculateTileCost, TileActionContext } from './utils/tileActions';

export default function App() {
  // --- Global State ---
  const [station, setStation] = useState(0);
  const [day, setDay] = useState(1);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [hp, setHp] = useState(MAX_HP);
  const [gold, setGold] = useState(0);

  // Inventory State
  const [inventory, setInventory] = useState<Inventory>(Array(INVENTORY_SIZE).fill(null));

  const [carriageLevel, setCarriageLevel] = useState(0);

  // Train Capacity & Rescued NPCs
  const [rescuedNPCs, setRescuedNPCs] = useState<{ buff: 'stamina' | 'health' | 'attack' }[]>([]);
  const maxTrainCapacity = GAME_CONFIG.MAP.NPC.TRAIN_CAPACITY_BASE;

  // Statistics for Score
  const [gameStats, setGameStats] = useState<GameStats>({
    totalWood: 0,
    totalStone: 0,
    enemiesDefeated: 0,
    itemsCrafted: 0,
    stationsPassed: 0,
    san: 0,
  });

  // Train State
  const [pressure, setPressure] = useState(0);
  const targetPressure = GAME_CONFIG.TRAIN.PRESSURE_BASE + (station - 1) * GAME_CONFIG.TRAIN.PRESSURE_PER_STATION;

  // View & Map State
  const [viewState, setViewState] = useState<ViewState>('map');
  const [grid, setGrid] = useState<TileType[]>([]);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [restReport, setRestReport] = useState<RestReport | null>(null);
  const [showEnemySpawnAnimation, setShowEnemySpawnAnimation] = useState(false);
  const [enemySpawnRate, setEnemySpawnRate] = useState(0);
  const [diceRolls, setDiceRolls] = useState<number[]>([]);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Computed Properties
  const currentLoad = inventory.reduce((acc, item) => acc + (item ? item.count : 0), 0);
  const maxCapacity = BASE_CAPACITY + (carriageLevel * CARRIAGE_CAPACITY_BONUS);

  // Apply NPC Buffs
  const staminaBuffs = rescuedNPCs.filter(npc => npc.buff === 'stamina').length;
  const healthBuffs = rescuedNPCs.filter(npc => npc.buff === 'health').length;
  const attackBuffs = rescuedNPCs.filter(npc => npc.buff === 'attack').length;

  const buffedMaxEnergy = MAX_ENERGY + (staminaBuffs * 5);
  const buffedMaxHp = MAX_HP + (healthBuffs * 5);
  const buffedAttack = GAME_CONFIG.ACTIONS.PLAYER_BASE_DMG + attackBuffs;

  // --- Helpers ---
  const addLog = useCallback((text: string, type: LogEntry['type'] = 'neutral') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text, type }, ...prev].slice(0, 15));
  }, []);

  const [selectedSlot, setSelectedSlot] = useState<number | undefined>(undefined);

  // Inventory Helpers (Refactored to be pure-ish)
  const addToInventory = (currentInv: Inventory, type: ItemType, count: number, durability?: number): { newInv: Inventory, added: number } => {
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

  const removeFromInventory = (currentInv: Inventory, type: ItemType, count: number): { newInv: Inventory, success: boolean } => {
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

  const findTool = (type: ItemType) => {
    return inventory.find(item => item?.type === type && (item.durability === undefined || item.durability > 0));
  };

  const decreaseToolDurability = (currentInv: Inventory, slotIndex: number): Inventory => {
    const newInv = [...currentInv];
    const item = newInv[slotIndex];

    if (item && item.durability !== undefined) {
      const newDurability = item.durability - 1;
      if (newDurability <= 0) {
        newInv[slotIndex] = null;
        addLog(`Your ${item.type} broke!`, 'error');
        if (selectedSlot === slotIndex) setSelectedSlot(undefined);
      } else {
        newInv[slotIndex] = { ...item, durability: newDurability };
      }
    }
    return newInv;
  };

  // Check Game Over
  useEffect(() => {
    if (hp <= 0 && viewState !== 'gameover') {
      setViewState('gameover');
    }
  }, [hp, viewState]);

  // --- Map Logic ---
  const generateMap = useCallback(() => {
    const newGrid = generateLevel(station, gameStats.san);
    setGrid(newGrid);
  }, [station, gameStats.san]);

  // Initialize Map
  useEffect(() => {
    if (viewState === 'map' && grid.length === 0) {
      generateMap();
      addLog(`Arrived at Sector ${station}. Environment scan complete.`, 'important');
    }
  }, [station, generateMap, viewState, grid.length, addLog]);

  const handleSlotClick = (index: number) => {
    if (selectedSlot === index) {
      setSelectedSlot(undefined);
    } else {
      setSelectedSlot(index);
    }
  };

  // --- Actions ---
  const handleTileClick = (tile: TileType) => {
    // Check if tile can be clicked
    console.log("Tile clicked" + tile.type);
    if (!canClickTile(tile, viewState)) {
      return;
    }

    // Create context for validation
    const context: TileActionContext = {
      tile,
      grid,
      inventory,
      energy,
      weather,
      viewState,
      rescuedNPCs,
      maxTrainCapacity,
      selectedSlot
    };

    // Validate and calculate cost
    const result = validateAndCalculateCost(context);
    if (!result.canProceed) {
      addLog(result.errorMessage!, "error");
      return;
    }
    const cost = result.cost;

    // Exploration Logic
    if (!tile.revealed && tile.peeked) {
      setEnergy(prev => prev - cost);

      const newGrid = [...grid];
      const targetTile = newGrid.find(t => t.id === tile.id);
      if (!targetTile) return;

      targetTile.explorationProgress = (targetTile.explorationProgress || 0) + 1;

      if (targetTile.explorationProgress >= (targetTile.maxExploration || 1)) {
        // Reveal!
        targetTile.revealed = true;
        targetTile.effect = 'pop';

        // Handle Discovery Rewards
        const rewardConfig = GAME_CONFIG.EXPLORATION.REWARD[targetTile.type.toUpperCase() as keyof typeof GAME_CONFIG.EXPLORATION.REWARD];
        if (rewardConfig) {
          const res = addToInventory(inventory, rewardConfig.type, rewardConfig.count);
          setInventory(res.newInv);
          addLog(`Explored and found ${rewardConfig.count} ${rewardConfig.type}!`, 'success');

          if (rewardConfig.type === 'wood') setGameStats(prev => ({ ...prev, totalWood: prev.totalWood + rewardConfig.count }));
          if (rewardConfig.type === 'stone') setGameStats(prev => ({ ...prev, totalStone: prev.totalStone + rewardConfig.count }));
        } else {
          addLog("Area explored.", 'neutral');
        }

        // If the revealed tile is transparent (like Search/Empty), it might reveal neighbors
        // We can use the utility isLightSource if we export it, or just check types
        // Search tiles are transparent.
        if (targetTile.type === 'search') {
          targetTile.cleared = true;
          const newlyRevealed = revealNeighbors(targetTile.x, targetTile.y, newGrid);
          // Handle ambush for newly revealed enemies from this chain reaction
          let ambushDmg = 0;
          newlyRevealed.forEach(t => {
            if (t.type === 'enemy') {
              ambushDmg += t.attack;
              addLog(`Ambush! Nearby enemy spotted! (HP -${t.attack})`, 'error');
              t.effect = 'flash';
            }
          });
          if (ambushDmg > 0) setHp(prev => prev - ambushDmg);
        }
      } else {
        addLog("Exploring...", 'neutral');
      }
      updatePeekStatus(newGrid);
      setGrid(newGrid);
      return;
    }

    // Broken Track Repair Logic (special case that returns early)
    if (tile.type === 'track' && tile.isBroken) {
      const woodCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_WOOD;
      const stoneCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_STONE;

      setEnergy(prev => prev - cost);

      // Deduct resources
      let tempInv = [...inventory];
      tempInv = removeFromInventory(tempInv, 'wood', woodCost).newInv;
      tempInv = removeFromInventory(tempInv, 'stone', stoneCost).newInv;
      setInventory(tempInv);

      // Fix track
      setGrid(prev => prev.map(t => t.id === tile.id ? { ...t, isBroken: false, effect: 'pop' } : t));
      addLog("Track repaired!", "success");
      return;
    }

    // Check Tool (for non-combat interactions)
    const config = TILE_TYPES[tile.type.toUpperCase()];
    if (config.tool && tile.type !== 'enemy') {
      const selectedItem = selectedSlot !== undefined ? inventory[selectedSlot] : null;
      // If a specific tool is required, check if it's selected OR if we have it (auto-select logic could go here, but let's stick to manual or auto-find)
      // For now, let's keep the auto-find logic for tools like Axe/Pickaxe for QoL, but prioritize selected.

      // Actually, let's enforce selection for everything if we want consistency?
      // The prompt only specified "click on bow to toggle active".
      // Let's keep auto-find for Axe/Pickaxe for QoL, but prioritize selected.

      let toolIndex = -1;
      if (selectedItem && selectedItem.type === config.tool) {
        toolIndex = selectedSlot!;
      } else {
        toolIndex = inventory.findIndex(item => item?.type === config.tool && (item.durability === undefined || item.durability > 0));
      }

      if (toolIndex === -1) {
        addLog(`Requires ${config.tool}!`, "error");
        return;
      }
    }

    const estimatedLoot = 1;
    if (currentLoad + estimatedLoot > maxCapacity && tile.type !== 'search' && tile.type !== 'enemy') {
      addLog("Cargo full! Cannot carry more.", "error");
      return;
    }

    setEnergy(prev => prev - cost);

    // Visual Effect
    setGrid(prev => prev.map(t => t.id === tile.id ? { ...t, effect: 'pop' } : t));
    setTimeout(() => {
      setGrid(prev => prev.map(t => t.id === tile.id ? { ...t, effect: null } : t));
    }, 400);

    let tempInv = [...inventory];
    const newGrid = [...grid];
    const targetTile = newGrid.find(t => t.id === tile.id);
    if (!targetTile) return;

    let dropMsg = "";
    let loot: { type: ItemType, count: number }[] = [];

    if (tile.type === 'enemy') {
      // Combat Logic
      const selectedItem = selectedSlot !== undefined ? tempInv[selectedSlot] : null;
      const isUsingBow = selectedItem?.type === 'bow';

      const playerDmg = isUsingBow ? GAME_CONFIG.ACTIONS.BOW_DMG : buffedAttack;
      const enemyDmg = targetTile.attack;

      // Apply Damage to Enemy
      targetTile.hp = (targetTile.hp || 0) - playerDmg;

      // Check if Enemy Defeated
      if ((targetTile.hp || 0) <= 0) {
        // Enemy Died
        targetTile.cleared = true;
        targetTile.type = 'search';
        dropMsg = `Enemy Defeated!`;
        setGameStats(prev => ({ ...prev, enemiesDefeated: prev.enemiesDefeated + 1 }));

        // Loot
        // Loot
        const woodAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_MIN;
        const stoneAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_MIN;
        if (woodAmt > 0) loot.push({ type: 'wood', count: woodAmt });
        if (stoneAmt > 0) loot.push({ type: 'stone', count: stoneAmt });

        // Gold
        const goldAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_GOLD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_GOLD_MIN;
        if (goldAmt > 0) {
          setGold(prev => prev + goldAmt);
          dropMsg += ` (+${goldAmt} G)`;
        }

        // Key
        const level = calculateEnemyLevel(station, gameStats.san);
        const keyChance = GAME_CONFIG.MAP.ENEMIES.LOOT_KEY_CHANCE_BASE + (level * GAME_CONFIG.MAP.ENEMIES.LOOT_KEY_CHANCE_LEVEL_MULT);
        if (Math.random() < keyChance) {
          loot.push({ type: 'key', count: 1 });
          dropMsg += ` (Found Key!)`;
        }

        // Player Damage Check
        if (isUsingBow) {
          addLog("Sniper Shot! Took no damage.", "success");
          // Bow Durability
          tempInv = decreaseToolDurability(tempInv, selectedSlot!);
        } else {
          setHp(prev => prev - enemyDmg);
          addLog(`Took ${enemyDmg} damage!`, "warning");
        }

      } else {
        // Enemy Survived
        setHp(prev => prev - enemyDmg);
        addLog(`Hit enemy for ${playerDmg}. Took ${enemyDmg} damage!`, "warning");
        if (isUsingBow) {
          tempInv = decreaseToolDurability(tempInv, selectedSlot!);
        }
      }

    } else {
      // Non-Combat Logic
      // const config = TILE_TYPES[tile.type.toUpperCase()]; // Already defined above
      if (config.tool) {
        // Find tool index using utility function
        const toolIndex = findToolIndex(tempInv, config.tool, selectedSlot);

        if (toolIndex !== -1) {
          tempInv = decreaseToolDurability(tempInv, toolIndex);
        }
      }

      // if (tile.type === 'search') {
      //   targetTile.cleared = true;
      // }
      if (tile.type === 'tree') {
        const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
        loot.push({ type: 'wood', count: amount });
        targetTile.scavengeLeft = (targetTile.scavengeLeft || 0) - 1;
        targetTile.searchCount = (targetTile.searchCount || 0) + 1;
        dropMsg = `Logging (+${amount} Wood)`;
        if (targetTile.scavengeLeft <= 0) {
          targetTile.cleared = true;
          targetTile.type = 'search';
        }
      } else if (tile.type === 'rock') {
        const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.ROCK_VAR) + GAME_CONFIG.MAP.LOOT.ROCK_MIN;
        loot.push({ type: 'stone', count: amount });
        dropMsg = `Mining (+${amount} Stone)`;
        targetTile.cleared = true;
        targetTile.type = 'search';
      } else if (tile.type === 'npc') {
        // NPC Rescue Logic
        targetTile.rescueProgress = (targetTile.rescueProgress || 0) - 1;

        if (targetTile.rescueProgress <= 0) {
          // Rescue Complete!
          targetTile.cleared = true;
          targetTile.type = 'search';

          const buff = targetTile.npcBuff || 'stamina';
          setRescuedNPCs(prev => [...prev, { buff }]);

          const buffNames = {
            'stamina': 'Max Stamina',
            'health': 'Max HP',
            'attack': 'Attack Power'
          };

          dropMsg = `NPC Rescued! Gained ${buffNames[buff]} buff!`;
          addLog(dropMsg, 'success');
        } else {
          dropMsg = `Rescuing... ${targetTile.rescueProgress} turns left`;
        }
      }
    }

    // Add Resources with Capacity check
    let totalAdded = 0;
    loot.forEach(item => {
      const res = addToInventory(tempInv, item.type, item.count);
      tempInv = res.newInv;
      const added = res.added;
      totalAdded += added;
      if (added < item.count) {
        addLog(`Inventory full! Discarded ${item.count - added} ${item.type}.`, "warning");
      }

      // Update Stats
      if (item.type === 'wood') setGameStats(prev => ({ ...prev, totalWood: prev.totalWood + added }));
      if (item.type === 'stone') setGameStats(prev => ({ ...prev, totalStone: prev.totalStone + added }));
    });

    setInventory(tempInv);

    if (dropMsg) addLog(dropMsg, tile.type === 'enemy' ? 'warning' : 'success');

    // Reveal logic via Utility
    let newlyRevealed: TileType[] = [];
    if (targetTile.cleared || targetTile.type === 'search' || tile.type === 'tree' || tile.type === 'rock') {
      newlyRevealed = revealNeighbors(targetTile.x, targetTile.y, newGrid);
    }

    let ambushDmg = 0;
    newlyRevealed.forEach(t => {
      if (t.type === 'enemy') {
        ambushDmg += t.attack;
        addLog(`Ambush! Nearby enemy spotted! (HP -${t.attack})`, 'error');
        t.effect = 'flash';
      }
    });

    if (ambushDmg > 0) {
      setHp(prev => prev - ambushDmg);
    }

    setGrid(newGrid);
  };

  const handleRest = () => {
    // Dice Logic: 1 die base + 1 per 100 Sanity
    const diceCount = 1 + Math.floor(gameStats.san / 100);
    const rolls: number[] = [];

    for (let i = 0; i < diceCount; i++) {
      // Roll 1-6
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }

    setDiceRolls(rolls);
    setShowEnemySpawnAnimation(true);
  };

  const handleEnemySpawnComplete = (spawnedCount: number) => {
    setShowEnemySpawnAnimation(false);

    // Now calculate the actual rest outcome using the count from the animation (which matches our pre-calc)
    const report = calculateRestOutcome(grid, pressure, energy, buffedMaxEnergy, station, gameStats.san, spawnedCount);
    setRestReport(report);
  };

  const applyRestResults = () => {
    if (!restReport) return;

    setEnergy(buffedMaxEnergy);
    // No HP recovery
    if (restReport.dmg > 0) setHp(prev => prev - restReport.dmg);
    setPressure(prev => Math.max(0, prev - restReport.pressureLoss));

    // Increment day and sanity
    setDay(prev => prev + 1);
    setGameStats(prev => ({ ...prev, san: prev.san + 50 }));

    // Handle spawned enemies from enemy spawn rate
    if (restReport.spawnedEnemies && restReport.spawnedEnemies.length > 0) {
      setGrid(prev => prev.map(t => {
        const spawnedEnemy = restReport.spawnedEnemies!.find(e => e.id === t.id);
        if (spawnedEnemy) {
          return {
            ...t,
            type: 'enemy',
            cleared: false,
            scavengeLeft: 0,
            attack: spawnedEnemy.attack,
            hp: spawnedEnemy.hp,
            maxHp: spawnedEnemy.hp
          };
        }
        return t;
      }));
      addLog(`${restReport.spawnedEnemies.length} enemy(ies) spawned during rest!`, "error");
    }

    if (restReport.ambush) {
      setGrid(prev => prev.map(t => {
        if (t.id === restReport.ambush!.id) {
          return { ...t, type: 'enemy', cleared: false, scavengeLeft: 0, attack: restReport.ambush!.attack };
        }
        return t;
      }));
      addLog("Night ambush! A cleared area was retaken!", "error");
    }

    setRestReport(null);
  };

  const craftItem = (key: string) => {
    const recipe = RECIPES[key];
    const staminaCost = recipe.staminaCost || 0;

    if (energy < staminaCost) {
      addLog("Not enough energy to craft!", "error");
      return;
    }

    // Check Resources
    const canCraft = recipe.input.every(req => {
      const count = inventory.reduce((acc, item) => (item?.type === req.type ? acc + item.count : acc), 0);
      return count >= req.count;
    });

    if (!canCraft) {
      addLog("Insufficient resources", "error");
      return;
    }

    let tempInv = [...inventory];

    // Consume Resources
    recipe.input.forEach(req => {
      const res = removeFromInventory(tempInv, req.type, req.count);
      if (res.success) tempInv = res.newInv;
    });

    // Consume Energy
    if (staminaCost > 0) {
      setEnergy(prev => prev - staminaCost);
    }

    // Add Output
    const output = recipe.output;
    // Check if we are repairing a tool (if it exists and has durability)
    const existingToolIndex = tempInv.findIndex(item => item?.type === output.type && item.maxDurability);

    if (existingToolIndex !== -1 && output.durability) {
      // Repair
      tempInv[existingToolIndex] = {
        ...tempInv[existingToolIndex]!,
        durability: output.durability
      };
      addLog(`Repaired: ${key}`, "success");
    } else {
      // Craft new
      const res = addToInventory(tempInv, output.type, output.count, output.durability);
      tempInv = res.newInv;
      if (res.added < output.count) {
        addLog("Inventory full! Item lost.", "error");
      } else {
        addLog(`Crafted: ${key}`, "success");
      }
    }

    setInventory(tempInv);
    setGameStats(prev => ({ ...prev, itemsCrafted: prev.itemsCrafted + 1 }));
  };

  const addFuel = (type: 'wood' | 'charcoal') => {
    if (pressure >= targetPressure) return;

    const res = removeFromInventory(inventory, type, 1);
    if (res.success) {
      setInventory(res.newInv);
      const gain = type === 'wood' ? GAME_CONFIG.TRAIN.FUEL_GAIN_WOOD : GAME_CONFIG.TRAIN.FUEL_GAIN_CHARCOAL;
      setPressure(prev => Math.min(prev + gain, targetPressure));
    } else {
      addLog(`No ${type} available`, "error");
    }
  };

  const depart = () => {
    // Check for broken tracks
    if (grid.some(t => t.type === 'track' && t.isBroken)) {
      addLog("Cannot depart! Tracks are broken.", "error");
      return;
    }

    setViewState('shop');
    addLog("Arrived at Trading Post...", "important");
  };

  const nextLevel = () => {
    setStation(prev => prev + 1);
    setGameStats(prev => ({ ...prev, stationsPassed: prev.stationsPassed + 1, san: 0 })); // Reset san on new sector
    setPressure(0);
    setEnergy(prev => Math.floor(prev * GAME_CONFIG.LEVEL_TRANSITION.ENERGY_RETAIN_PCT));
    setViewState('map');
    setGrid([]);
  };

  // Shop Functions
  const sellResource = (type: ItemType) => {
    const res = removeFromInventory(inventory, type, 1);
    if (res.success) {
      setInventory(res.newInv);
      const price = type === 'charcoal' ? GAME_CONFIG.SHOP.SELL.CHARCOAL :
        type === 'wood' ? GAME_CONFIG.SHOP.SELL.WOOD :
          GAME_CONFIG.SHOP.SELL.STONE;
      setGold(prev => prev + price);
    }
  };

  const buyCarriage = () => {
    const cost = GAME_CONFIG.SHOP.BUY.CARRIAGE_BASE * (carriageLevel + 1);
    if (gold >= cost) {
      setGold(prev => prev - cost);
      setCarriageLevel(prev => prev + 1);
      addLog("Carriage Upgraded!", "success");
    } else {
      addLog("Not enough Gold", "error");
    }
  };

  const buyHeal = () => {
    const cost = GAME_CONFIG.SHOP.BUY.HEAL;
    if (gold >= cost) {
      if (hp >= buffedMaxHp && energy >= buffedMaxEnergy) {
        addLog("Already fully rested.", "neutral");
        return;
      }
      setGold(prev => prev - cost);
      setHp(buffedMaxHp);
      setEnergy(buffedMaxEnergy);
      addLog("Rations consumed. Full recovery.", "success");
    } else {
      addLog("Not enough Gold", "error");
    }
  };

  const restartGame = () => {
    setStation(1);
    setDay(1);
    setEnergy(MAX_ENERGY);
    setHp(MAX_HP);
    setGold(0);
    setInventory(Array(INVENTORY_SIZE).fill(null));
    setCarriageLevel(0);
    setRescuedNPCs([]);
    setPressure(0);
    setGrid([]);
    setLogs([]);
    setGameStats({
      totalWood: 0,
      totalStone: 0,
      enemiesDefeated: 0,
      itemsCrafted: 0,
      stationsPassed: 0,
      san: 0,
    });
    setViewState('map');
    setRestReport(null);
  };

  // Check if player is exhausted (no actions possible)
  const isExhausted = React.useMemo(() => {
    if (energy === 0) return true;

    let hasStaminaBlockedAction = false;
    let hasPossibleAction = false;

    // 1. Check Crafting
    for (const key in RECIPES) {
      const recipe = RECIPES[key];
      const staminaCost = recipe.staminaCost || 0;

      const hasResources = recipe.input.every(req => {
        const count = inventory.reduce((acc, item) => (item?.type === req.type ? acc + item.count : acc), 0);
        return count >= req.count;
      });

      if (hasResources) {
        if (energy >= staminaCost) {
          hasPossibleAction = true;
          break;
        } else {
          hasStaminaBlockedAction = true;
        }
      }
    }

    if (!hasPossibleAction) {
      // 2. Check Tile Actions
      for (const tile of grid) {
        if (!tile.revealed || tile.type === 'void' || tile.type === 'track') continue;
        if (tile.cleared && !(tile.type === 'search' && tile.scavengeLeft > 0)) continue;

        // Use utility function for cost calculation
        const cost = calculateTileCost(tile, weather);

        // Check Tool Requirement
        const config = TILE_TYPES[tile.type.toUpperCase()];
        if (config.tool && tile.type !== 'enemy') {
          const hasTool = inventory.some(item => item?.type === config.tool && (item.durability === undefined || item.durability > 0));
          if (!hasTool) continue;
        }

        if (energy >= cost) {
          hasPossibleAction = true;
          break;
        } else {
          hasStaminaBlockedAction = true;
        }
      }
    }

    return !hasPossibleAction && hasStaminaBlockedAction;
  }, [energy, grid, inventory, weather]);

  return (
    <div className="h-screen bg-stone-950 text-stone-200 font-sans select-none overflow-hidden flex flex-col">

      <Header
        station={station}
        day={day}
        san={gameStats.san}
        weather={weather}
        gold={gold}
        inventory={inventory}
        pressure={pressure}
        targetPressure={targetPressure}
        viewState={viewState}
        rescuedNPCs={rescuedNPCs}
        maxTrainCapacity={maxTrainCapacity}
        onAddFuel={addFuel}
        onDepart={depart}
      />

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">

        {/* View Overlays */}
        {viewState === 'shop' && (
          <ShopOverlay
            station={station}
            gold={gold}
            inventory={inventory}
            carriageLevel={carriageLevel}
            onSell={sellResource}
            onBuyCarriage={buyCarriage}
            onBuyHeal={buyHeal}
            onNextLevel={nextLevel}
          />
        )}

        {viewState === 'gameover' && (
          <GameOverModal
            stats={gameStats}
            gold={gold}
            onRestart={restartGame}
          />
        )}

        {/* Map Section */}
        <section className="flex-1 bg-[#0c0a09] relative overflow-hidden flex flex-col">
          {/* Grid Container */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center custom-scrollbar">
            <div className="grid grid-cols-8 gap-2 sm:gap-3 p-4 bg-stone-900 rounded-2xl shadow-2xl border border-stone-800">
              {grid.map((tile) => {
                // Check for adjacent enemies
                let isBlocked = false;
                if (tile.type !== 'enemy') {
                  const neighbors = [
                    grid.find(t => t.x === tile.x && t.y === tile.y - 1), // Up
                    grid.find(t => t.x === tile.x && t.y === tile.y + 1), // Down
                    grid.find(t => t.x === tile.x - 1 && t.y === tile.y), // Left
                    grid.find(t => t.x === tile.x + 1 && t.y === tile.y)  // Right
                  ];
                  isBlocked = neighbors.some(n => n && n.type === 'enemy' && n.revealed && !n.cleared);
                }

                return (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    inventory={inventory}
                    weather={weather}
                    energy={energy}
                    rescuedNPCs={rescuedNPCs.length}
                    onTileClick={handleTileClick}
                    isBlocked={isBlocked}
                  />
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto mb-2">
            <InventoryBar
              inventory={inventory}
              selectedSlot={selectedSlot}
              onSlotClick={handleSlotClick}
              onCraftClick={() => setShowWorkshopModal(true)}
              currentLoad={currentLoad}
              maxCapacity={maxCapacity}
            />
          </div>

          <StatusFooter
            hp={hp}
            maxHp={buffedMaxHp}
            energy={energy}
            maxEnergy={buffedMaxEnergy}
            currentLoad={currentLoad}
            maxCapacity={maxCapacity}
            avatar={getAvatarFace(hp, buffedMaxHp, energy, buffedMaxEnergy)}
            attack={selectedSlot !== undefined && inventory[selectedSlot]?.type === 'bow' ? GAME_CONFIG.ACTIONS.BOW_DMG : buffedAttack}
            onRest={handleRest}
            isExhausted={isExhausted}
            logs={logs}
            onLogClick={() => setShowLogModal(true)}
          />
        </section>
      </main>

      {/* Enemy Spawn Animation (Dice) */}
      {showEnemySpawnAnimation && (
        <DiceSpawnAnimation
          diceCount={1 + Math.floor(gameStats.san / 100)}
          diceRolls={diceRolls}
          onComplete={handleEnemySpawnComplete}
        />
      )}

      {/* Rest Report Modal */}
      {restReport && <RestReportModal report={restReport} onClose={applyRestResults} />}

      {/* Workshop Modal */}
      {showWorkshopModal && (
        <WorkshopModal
          inventory={inventory}
          energy={energy}
          onCraft={craftItem}
          onClose={() => setShowWorkshopModal(false)}
        />
      )}

      {/* Log Modal */}
      {showLogModal && (
        <LogModal
          logs={logs}
          onClose={() => setShowLogModal(false)}
        />
      )}

    </div>
  );
}
