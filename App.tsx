
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
import { CargoModal } from './components/CargoModal';
import { LocomotiveModal } from './components/LocomotiveModal';
import { InventoryBar } from './components/InventoryBar';

// Utilities
import { generateLevel, revealNeighbors, updatePeekStatus } from './utils/map';
import { getAvatarFace, calculateRestOutcome, calculateEnemyLevel } from './utils/gameplay';
import { canClickTile, validateAndCalculateCost, findToolIndex, calculateTileCost, TileActionContext } from './utils/tileActions';
import { processExplorationReveal, processCombat, processInteraction, processItemConsumption } from './utils/interactionLogic';
import { addToInventory, removeFromInventory, consumeResources, decreaseToolDurability, consumeFromCombinedInventory } from './utils/inventory';

export default function App() {
  // --- Global State ---
  const [station, setStation] = useState(0);
  const [day, setDay] = useState(1);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [hp, setHp] = useState(MAX_HP);
  const [gold, setGold] = useState(0);
  const [time, setTime] = useState(360); // 6:00 AM in minutes

  // Inventory State
  const [inventory, setInventory] = useState<Inventory>(Array(INVENTORY_SIZE).fill(null));
  const [cargoStorage, setCargoStorage] = useState<Inventory>(Array(INVENTORY_SIZE).fill(null));

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
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [showLocomotiveModal, setShowLocomotiveModal] = useState(false);

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

  // Time Management
  const advanceTime = useCallback((minutes: number) => {
    setTime(prevTime => {
      const newTime = prevTime + minutes;

      // Check for midnight crossing (1440 minutes = 24:00)
      if (prevTime < 1440 && newTime >= 1440) {
        addLog("It's midnight. You should rest.", "important");
      }

      // Late night penalty
      if (prevTime >= 1440) {
        setGameStats(prev => ({ ...prev, san: prev.san + 5 }));
        addLog("Staying up late is draining your sanity... (+5 SAN)", "warning");
      }

      return newTime;
    });
  }, [addLog]);

  // Inventory Helpers (Refactored to be pure-ish)
  // Removed local implementations, using imported ones from utils/inventory.ts

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
      advanceTime(10);

      const newGrid = [...grid];
      const targetTileIndex = newGrid.findIndex(t => t.id === tile.id);
      if (targetTileIndex === -1) return;

      const targetTile = { ...newGrid[targetTileIndex] };
      targetTile.explorationProgress = (targetTile.explorationProgress || 0) + 1;

      if (targetTile.explorationProgress >= (targetTile.maxExploration || 1)) {
        // Reveal!
        const { updatedTile, loot, logs: newLogs } = processExplorationReveal(targetTile, newGrid);
        newGrid[targetTileIndex] = updatedTile;

        newLogs.forEach(log => addLog(log.text, log.type));

        loot.forEach(item => {
          const res = addToInventory(inventory, item.type, item.count);
          setInventory(res.newInv);
          if (item.type === 'wood') setGameStats(prev => ({ ...prev, totalWood: prev.totalWood + item.count }));
          if (item.type === 'stone') setGameStats(prev => ({ ...prev, totalStone: prev.totalStone + item.count }));
        });

        // If the revealed tile is transparent (like Search/Empty), it might reveal neighbors
        if (updatedTile.type === 'search') {
          const newlyRevealed = revealNeighbors(updatedTile.x, updatedTile.y, newGrid);
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
        newGrid[targetTileIndex] = targetTile;
        addLog("Exploring...", 'neutral');
      }
      updatePeekStatus(newGrid);
      setGrid(newGrid);
      return;
    }

    // Train Carriages Interaction
    if (tile.type === 'locomotive') {
      if (selectedSlot !== undefined) {
        const item = inventory[selectedSlot];
        if (item && (item.type === 'wood' || item.type === 'charcoal')) {
          addFuel(item.type);
          if (item.count <= 1) setSelectedSlot(undefined);
          return;
        }
      }
      // Open modal if no fuel selected (or even if other items selected, though logic above handles fuel)
      setShowLocomotiveModal(true);
      return;
    }

    if (tile.type === 'workshop_carriage') {
      setShowWorkshopModal(true);
      return;
    }

    if (tile.type === 'cargo_carriage') {
      if (selectedSlot !== undefined) {
        const item = inventory[selectedSlot];
        if (item) {
          const res = addToInventory(cargoStorage, item.type, item.count, item.durability);
          setCargoStorage(res.newInv);
          advanceTime(10);

          const addedCount = res.added;
          if (addedCount > 0) {
            const removeRes = removeFromInventory(inventory, item.type, addedCount);
            setInventory(removeRes.newInv);
            if (removeRes.newInv[selectedSlot] === null) setSelectedSlot(undefined);
            addLog(`Stored ${addedCount} ${item.type}`, "success");
          } else {
            addLog("Cargo full!", "error");
          }
        }
      } else {
        setShowCargoModal(true);
      }
      return;
    }

    // Repair Logic (Track & Bridge)
    if ((tile.type === 'track' || tile.type === 'bridge') && tile.isBroken) {
      const woodCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_WOOD;
      const stoneCost = GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_COST_STONE;

      // Define cost as requirements
      const requirements: { type: ItemType; count: number }[] = [
        { type: 'wood', count: woodCost },
        { type: 'stone', count: stoneCost }
      ];

      // Use consumeResources helper
      const { newInv, success } = consumeResources(inventory, requirements);

      if (!success) {
        addLog("Insufficient resources to repair!", "error");
        return;
      }

      setEnergy(prev => prev - cost);
      setInventory(newInv);
      advanceTime(10);

      // Update Repair Progress
      setGrid(prev => prev.map(t => {
        if (t.id === tile.id) {
          const newProgress = (t.repairProgress || 0) + 1;
          const maxProgress = t.maxRepairProgress || GAME_CONFIG.MAP.BROKEN_TRACKS.REPAIR_CLICKS;

          if (newProgress >= maxProgress) {
            addLog(`${tile.type === 'bridge' ? 'Bridge' : 'Track'} repaired!`, "success");
            return { ...t, isBroken: false, effect: 'pop', repairProgress: undefined };
          } else {
            addLog(`Repairing... (${newProgress}/${maxProgress})`, "neutral");
            return { ...t, repairProgress: newProgress, maxRepairProgress: maxProgress, effect: 'pop' };
          }
        }
        return t;
      }));
      return;
    }

    // Check Tool (for non-combat interactions)
    const config = TILE_TYPES[tile.type.toUpperCase()];
    if (config.tool && tile.type !== 'enemy') {
      const toolIndex = findToolIndex(inventory, config.tool, selectedSlot);
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
    advanceTime(10);

    let tempInv = [...inventory];
    const newGrid = [...grid];
    const targetTileIndex = newGrid.findIndex(t => t.id === tile.id);
    if (targetTileIndex === -1) return;
    const targetTile = { ...newGrid[targetTileIndex] };

    let loot: { type: ItemType, count: number }[] = [];
    let dropMsg = "";

    if (tile.type === 'enemy') {
      const { updatedTile, hpChange, goldChange, loot: combatLoot, logs: combatLogs, statsUpdate, toolDurabilityIndex } = processCombat(
        targetTile,
        tempInv,
        selectedSlot,
        selectedSlot !== undefined && tempInv[selectedSlot]?.type === 'bow' ? GAME_CONFIG.ACTIONS.BOW_DMG : buffedAttack,
        station,
        gameStats.san
      );

      newGrid[targetTileIndex] = updatedTile;
      if (hpChange !== 0) setHp(prev => prev + hpChange);
      if (goldChange !== 0) setGold(prev => prev + goldChange);
      if (statsUpdate.enemiesDefeated) setGameStats(prev => ({ ...prev, enemiesDefeated: prev.enemiesDefeated + statsUpdate.enemiesDefeated! }));

      combatLogs.forEach(log => addLog(log.text, log.type));
      loot = combatLoot;

      if (toolDurabilityIndex !== undefined) {
        const res = decreaseToolDurability(tempInv, toolDurabilityIndex);
        tempInv = res.newInv;
        if (res.broken) {
          addLog(`Your ${res.itemType} broke!`, 'error');
          setSelectedSlot(undefined);
        }
      }

    } else {
      // Non-Combat Logic
      if (config.tool) {
        const toolIndex = findToolIndex(tempInv, config.tool, selectedSlot);
        if (toolIndex !== -1) {
          const res = decreaseToolDurability(tempInv, toolIndex);
          tempInv = res.newInv;
          if (res.broken) {
            addLog(`Your ${res.itemType} broke!`, 'error');
            if (selectedSlot === toolIndex) setSelectedSlot(undefined);
          }
        }
      }

      const { updatedTile, loot: interactLoot, logs: interactLogs, rescuedNPC } = processInteraction(targetTile, tempInv, selectedSlot);

      newGrid[targetTileIndex] = updatedTile;
      interactLogs.forEach(log => addLog(log.text, log.type));
      loot = interactLoot;

      if (rescuedNPC) {
        setRescuedNPCs(prev => [...prev, rescuedNPC!]);
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

    // Reveal logic via Utility
    const updatedTarget = newGrid[targetTileIndex];
    let newlyRevealed: TileType[] = [];
    if (updatedTarget.cleared || updatedTarget.type === 'search' || tile.type === 'tree' || tile.type === 'rock') {
      newlyRevealed = revealNeighbors(updatedTarget.x, updatedTarget.y, newGrid);
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

  const handleAvatarClick = () => {
    if (selectedSlot === undefined) return;
    const item = inventory[selectedSlot];

    const { success, hpChange, energyChange, logs: consumptionLogs } = processItemConsumption(
      item, hp, buffedMaxHp, energy, buffedMaxEnergy
    );

    consumptionLogs.forEach(log => addLog(log.text, log.type));

    if (success && item) {
      const res = removeFromInventory(inventory, item.type, 1);
      if (res.success) {
        setInventory(res.newInv);
        setHp(prev => Math.min(prev + (GAME_CONFIG.ITEMS.BERRY.HEAL), buffedMaxHp));
        setEnergy(prev => Math.min(prev + energyChange, buffedMaxEnergy));
        advanceTime(10);

        // If run out, deselect
        if (item.count <= 1) {
          setSelectedSlot(undefined);
        }
      }
    }
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
    setTime(360); // Reset to 6:00 AM
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

    // Check Resources and Consume (from Inventory + Cargo)
    const { newPrimary, newSecondary, success } = consumeFromCombinedInventory(inventory, cargoStorage, recipe.input);

    if (!success) {
      addLog("Insufficient resources (checked Inventory & Cargo)", "error");
      return;
    }

    let tempInv = newPrimary;
    const tempCargo = newSecondary;

    // Update Cargo
    setCargoStorage(tempCargo);

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
      advanceTime(10);
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
    advanceTime(10);
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
      advanceTime(10);
    }
  };

  const buyCarriage = () => {
    const cost = GAME_CONFIG.SHOP.BUY.CARRIAGE_BASE * (carriageLevel + 1);
    if (gold >= cost) {
      setGold(prev => prev - cost);
      setCarriageLevel(prev => prev + 1);
      addLog("Carriage Upgraded!", "success");
      advanceTime(10);
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
      advanceTime(10);
    } else {
      addLog("Not enough Gold", "error");
    }
  };

  const restartGame = () => {
    setStation(1);
    setDay(1);
    setTime(360);
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
        time={time}
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
                // Check for adjacent enemies or broken bridges
                let isBlocked = false;
                if (tile.type !== 'enemy') {
                  const neighbors = [
                    grid.find(t => t.x === tile.x && t.y === tile.y - 1), // Up
                    grid.find(t => t.x === tile.x && t.y === tile.y + 1), // Down
                    grid.find(t => t.x === tile.x - 1 && t.y === tile.y), // Left
                    grid.find(t => t.x === tile.x + 1 && t.y === tile.y)  // Right
                  ];

                  // Blocked if any neighbor is an active enemy
                  const enemyBlocked = neighbors.some(n => n && n.type === 'enemy' && n.revealed && !n.cleared);

                  // Also blocked if adjacent to a broken bridge (unless we are ON the bridge, but we can't be on a broken bridge usually)
                  // Actually, if a tile is adjacent to a broken bridge, can we enter it? 
                  // The user said: "if broken bridge is not repaired, cannot pass to surrounding tiles".
                  // This sounds like the bridge itself is the blocker? Or the bridge blocks movement *through* it?
                  // "Like enemy block behavior" implies if I am next to a broken bridge, I cannot click the broken bridge? 
                  // Or I cannot click tiles *around* the broken bridge?
                  // Enemy block: "If a tile is blocked by an enemy, the 'block' icon is displayed on top... prevent users from attempting to click on tiles that are visually marked as explorable".
                  // So if I am at (0,0) and (0,1) is an enemy, I cannot click (0,0)? No, I cannot click (0,1)?
                  // The current code says: `isBlocked = neighbors.some(n => n && n.type === 'enemy' ...)`
                  // This means if I am `tile`, and I have a neighbor that is an enemy, `tile` is blocked.
                  // So if I am adjacent to an enemy, I am blocked.
                  // So if I am adjacent to a broken bridge, I am blocked? That seems harsh.
                  // Maybe the user means the bridge *itself* is blocked?
                  // "If broken bridge not repaired, cannot go to surrounding tiles" -> "cannot go past it".
                  // Let's assume the user means: If a tile is adjacent to a broken bridge, you cannot enter that tile? 
                  // Or does it mean the bridge acts like an enemy and blocks its neighbors?
                  // "and enemy's block behavior is a bit like" -> "similar to enemy block behavior".
                  // Enemy block behavior: Neighboring tiles of an enemy are blocked.
                  // So: Neighboring tiles of a broken bridge are blocked.

                  const bridgeBlocked = neighbors.some(n => n && n.type === 'bridge' && n.isBroken && n.revealed);

                  isBlocked = enemyBlocked || bridgeBlocked;
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
            onNap={() => {
              if (energy >= buffedMaxEnergy) {
                addLog("Already fully rested!", "neutral");
                return;
              }
              setEnergy(prev => Math.min(prev + 10, buffedMaxEnergy));
              advanceTime(30);
              addLog("Took a nap. (+10 Stamina)", "success");
            }}
            isExhausted={isExhausted}
            logs={logs}
            onLogClick={() => setShowLogModal(true)}
            onAvatarClick={handleAvatarClick}
          />
        </section>
      </main>

      {/* Locomotive Modal */}
      {showLocomotiveModal && (
        <LocomotiveModal
          pressure={pressure}
          targetPressure={targetPressure}
          inventory={inventory}
          viewState={viewState}
          onAddFuel={addFuel}
          onDepart={() => {
            depart();
            setShowLocomotiveModal(false);
          }}
          onClose={() => setShowLocomotiveModal(false)}
        />
      )}

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
          cargo={cargoStorage}
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

      {/* Cargo Modal */}
      {showCargoModal && (
        <CargoModal
          cargo={cargoStorage}
          onRetrieve={(index) => {
            const item = cargoStorage[index];
            if (item) {
              const res = addToInventory(inventory, item.type, item.count, item.durability);
              setInventory(res.newInv);
              const added = res.added;
              if (added > 0) {
                // Remove from cargo
                const removeRes = removeFromInventory(cargoStorage, item.type, added);
                setCargoStorage(removeRes.newInv);
                addLog(`Retrieved ${added} ${item.type}`, "success");
                advanceTime(10);
              } else {
                addLog("Inventory full!", "error");
              }
            }
          }}
          onClose={() => setShowCargoModal(false)}
        />
      )}

    </div>
  );
}
