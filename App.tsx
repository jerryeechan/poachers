
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
import { Header } from './components/Header';
import { StatusFooter } from './components/StatusFooter';
import { WorkshopPanel } from './components/WorkshopPanel';
import { InventoryBar } from './components/InventoryBar';

// Utilities
import { generateLevel, revealNeighbors } from './utils/map';
import { getAvatarFace, calculateRestOutcome } from './utils/gameplay';

export default function App() {
  // --- Global State ---
  const [station, setStation] = useState(1);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [hp, setHp] = useState(MAX_HP);
  const [gold, setGold] = useState(0);

  // Inventory State
  const [inventory, setInventory] = useState<Inventory>(Array(INVENTORY_SIZE).fill(null));

  const [carriageLevel, setCarriageLevel] = useState(0);

  // Statistics for Score
  const [gameStats, setGameStats] = useState<GameStats>({
    totalWood: 0,
    totalStone: 0,
    enemiesDefeated: 0,
    itemsCrafted: 0,
    stationsPassed: 0,
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

  // Computed Properties
  const currentLoad = inventory.reduce((acc, item) => acc + (item ? item.count : 0), 0);
  const maxCapacity = BASE_CAPACITY + (carriageLevel * CARRIAGE_CAPACITY_BONUS);

  // --- Helpers ---
  const addLog = useCallback((text: string, type: LogEntry['type'] = 'neutral') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text, type }, ...prev].slice(15));
  }, []);

  // Inventory Helpers
  const addToInventory = (type: ItemType, count: number, durability?: number): number => {
    let remaining = count;
    const newInv = [...inventory];
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

    setInventory(newInv);
    return count - remaining; // Return amount actually added
  };

  const removeFromInventory = (type: ItemType, count: number): boolean => {
    // Check if we have enough first
    const total = inventory.reduce((acc, item) => (item?.type === type ? acc + item.count : acc), 0);
    if (total < count) return false;

    let remaining = count;
    const newInv = [...inventory];

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

    setInventory(newInv);
    return true;
  };

  const findTool = (type: ItemType) => {
    return inventory.find(item => item?.type === type && (item.durability === undefined || item.durability > 0));
  };

  const decreaseToolDurability = (type: ItemType) => {
    const newInv = [...inventory];
    const index = newInv.findIndex(item => item?.type === type && (item.durability === undefined || item.durability > 0));

    if (index !== -1) {
      const item = newInv[index]!;
      if (item.durability !== undefined) {
        const newDurability = item.durability - 1;
        if (newDurability <= 0) {
          newInv[index] = null;
          addLog(`Your ${type} broke!`, 'error');
        } else {
          newInv[index] = { ...item, durability: newDurability };
        }
        setInventory(newInv);
      }
    }
  };

  // Check Game Over
  useEffect(() => {
    if (hp <= 0 && viewState !== 'gameover') {
      setViewState('gameover');
    }
  }, [hp, viewState]);

  // --- Map Logic ---
  const generateMap = useCallback(() => {
    const newGrid = generateLevel(station);
    setGrid(newGrid);
  }, [station]);

  // Initialize Map
  useEffect(() => {
    if (viewState === 'map' && grid.length === 0) {
      generateMap();
      addLog(`Arrived at Sector ${station}. Environment scan complete.`, 'important');
    }
  }, [station, generateMap, viewState, grid.length, addLog]);


  // --- Actions ---
  const handleTileClick = (tile: TileType) => {
    if (viewState === 'gameover') return;
    if (!tile.revealed || tile.type === 'void' || tile.type === 'track') return;
    if (tile.cleared && !(tile.type === 'search' && tile.scavengeLeft > 0)) return;

    const config = TILE_TYPES[tile.type.toUpperCase()];
    let cost = weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;
    if (tile.type === 'search') {
      const tileSearchCount = tile.searchCount || 0;
      cost = GAME_CONFIG.ACTIONS.SEARCH_COST_INITIAL + (tileSearchCount * GAME_CONFIG.ACTIONS.SEARCH_COST_INCREASE);
    }

    if (energy < cost) {
      addLog("Exhausted! You need to Rest.", "error");
      return;
    }

    // Check Tool
    if (config.tool) {
      const tool = findTool(config.tool as ItemType);
      if (!tool) {
        addLog(`Requires ${config.tool}!`, "error");
        return;
      }
    }

    const estimatedLoot = 1;
    if (currentLoad + estimatedLoot > maxCapacity && tile.type !== 'search') {
      addLog("Cargo full! Cannot carry more.", "error");
      return;
    }

    setEnergy(prev => prev - cost);

    // Visual Effect
    setGrid(prev => prev.map(t => t.id === tile.id ? { ...t, effect: 'pop' } : t));
    setTimeout(() => {
      setGrid(prev => prev.map(t => t.id === tile.id ? { ...t, effect: null } : t));
    }, 400);

    // Tool Durability
    if (config.tool) {
      decreaseToolDurability(config.tool as ItemType);
    }

    const newGrid = [...grid];
    const targetTile = newGrid.find(t => t.id === tile.id);
    if (!targetTile) return;

    let dropMsg = "";
    let loot: { type: ItemType, count: number }[] = [];

    if (tile.type === 'tree') {
      const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
      loot.push({ type: 'wood', count: amount });
      targetTile.scavengeLeft = (targetTile.scavengeLeft || 0) - 1;
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
    } else if (tile.type === 'enemy') {
      const hasBow = findTool('bow');
      const dmg = Math.max(1, targetTile.attack - (hasBow ? GAME_CONFIG.ACTIONS.BOW_BONUS_DMG : 0));
      setHp(prev => prev - dmg);
      if (hasBow) {
        decreaseToolDurability('bow');
      }

      const woodAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_MIN;
      const stoneAmt = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_MIN;
      if (woodAmt > 0) loot.push({ type: 'wood', count: woodAmt });
      if (stoneAmt > 0) loot.push({ type: 'stone', count: stoneAmt });

      dropMsg = `Enemy Defeated (HP -${dmg})`;
      targetTile.cleared = true;
      targetTile.type = 'search';
      setGameStats(prev => ({ ...prev, enemiesDefeated: prev.enemiesDefeated + 1 }));
    } else if (tile.type === 'search') {
      targetTile.scavengeLeft = (targetTile.scavengeLeft || 0) - 1;
      targetTile.searchCount = (targetTile.searchCount || 0) + 1;
      const roll = Math.random();
      if (roll < GAME_CONFIG.MAP.LOOT.EMPTY_CHANCE_WOOD) {
        loot.push({ type: 'wood', count: 1 });
        dropMsg = "Found stray branch (+1 Wood)";
      } else if (roll < GAME_CONFIG.MAP.LOOT.EMPTY_CHANCE_STONE_THRESHOLD) {
        loot.push({ type: 'stone', count: 1 });
        dropMsg = "Found loose rock (+1 Stone)";
      } else {
        dropMsg = "Nothing found...";
      }
      if (!targetTile.cleared) targetTile.cleared = true;
    }

    // Add Resources with Capacity check
    let totalAdded = 0;
    loot.forEach(item => {
      const added = addToInventory(item.type, item.count);
      totalAdded += added;
      if (added < item.count) {
        addLog(`Inventory full! Discarded ${item.count - added} ${item.type}.`, "warning");
      }

      // Update Stats
      if (item.type === 'wood') setGameStats(prev => ({ ...prev, totalWood: prev.totalWood + added }));
      if (item.type === 'stone') setGameStats(prev => ({ ...prev, totalStone: prev.totalStone + added }));
    });

    if (dropMsg) addLog(dropMsg, tile.type === 'enemy' ? 'warning' : 'success');

    // Reveal logic via Utility
    let newlyRevealed: TileType[] = [];
    if (targetTile.cleared || targetTile.type === 'search') {
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
    const report = calculateRestOutcome(grid, pressure, energy, MAX_ENERGY);
    setRestReport(report);
  };

  const applyRestResults = () => {
    if (!restReport) return;

    setEnergy(MAX_ENERGY);
    // No HP recovery
    if (restReport.dmg > 0) setHp(prev => prev - restReport.dmg);
    setPressure(prev => Math.max(0, prev - restReport.pressureLoss));

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

    // Check Resources
    const canCraft = recipe.input.every(req => {
      const count = inventory.reduce((acc, item) => (item?.type === req.type ? acc + item.count : acc), 0);
      return count >= req.count;
    });

    if (!canCraft) {
      addLog("Insufficient resources", "error");
      return;
    }

    // Consume Resources
    recipe.input.forEach(req => {
      removeFromInventory(req.type, req.count);
    });

    // Add Output
    const output = recipe.output;
    // Check if we are repairing a tool (if it exists and has durability)
    const existingToolIndex = inventory.findIndex(item => item?.type === output.type && item.maxDurability);

    if (existingToolIndex !== -1 && output.durability) {
      // Repair
      const newInv = [...inventory];
      newInv[existingToolIndex] = {
        ...newInv[existingToolIndex]!,
        durability: output.durability
      };
      setInventory(newInv);
      addLog(`Repaired: ${key}`, "success");
    } else {
      // Craft new
      const added = addToInventory(output.type, output.count, output.durability);
      if (added < output.count) {
        addLog("Inventory full! Item lost.", "error");
      } else {
        addLog(`Crafted: ${key}`, "success");
      }
    }

    setGameStats(prev => ({ ...prev, itemsCrafted: prev.itemsCrafted + 1 }));
  };

  const addFuel = (type: 'wood' | 'charcoal') => {
    if (pressure >= targetPressure) return;

    if (removeFromInventory(type, 1)) {
      const gain = type === 'wood' ? GAME_CONFIG.TRAIN.FUEL_GAIN_WOOD : GAME_CONFIG.TRAIN.FUEL_GAIN_CHARCOAL;
      setPressure(prev => Math.min(prev + gain, targetPressure));
    } else {
      addLog(`No ${type} available`, "error");
    }
  };

  const depart = () => {
    setViewState('shop');
    addLog("Arrived at Trading Post...", "important");
  };

  const nextLevel = () => {
    setStation(prev => prev + 1);
    setGameStats(prev => ({ ...prev, stationsPassed: prev.stationsPassed + 1 }));
    setPressure(0);
    setEnergy(prev => Math.floor(prev * GAME_CONFIG.LEVEL_TRANSITION.ENERGY_RETAIN_PCT));
    setViewState('map');
    setGrid([]);
  };

  // Shop Functions
  const sellResource = (type: ItemType) => {
    if (removeFromInventory(type, 1)) {
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
      if (hp >= MAX_HP && energy >= MAX_ENERGY) {
        addLog("Already fully rested.", "neutral");
        return;
      }
      setGold(prev => prev - cost);
      setHp(MAX_HP);
      setEnergy(MAX_ENERGY);
      addLog("Rations consumed. Full recovery.", "success");
    } else {
      addLog("Not enough Gold", "error");
    }
  };

  const restartGame = () => {
    setStation(1);
    setEnergy(MAX_ENERGY);
    setHp(MAX_HP);
    setGold(0);
    setInventory(Array(INVENTORY_SIZE).fill(null));
    setCarriageLevel(0);
    setPressure(0);
    setGrid([]);
    setLogs([]);
    setGameStats({
      totalWood: 0,
      totalStone: 0,
      enemiesDefeated: 0,
      itemsCrafted: 0,
      stationsPassed: 0,
    });
    setViewState('map');
    setRestReport(null);
  };

  return (
    <div className="h-screen bg-stone-950 text-stone-200 font-sans select-none overflow-hidden flex flex-col">

      <Header
        station={station}
        weather={weather}
        gold={gold}
        inventory={inventory}
        pressure={pressure}
        targetPressure={targetPressure}
        viewState={viewState}
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
              {grid.map((tile) => (
                <Tile
                  key={tile.id}
                  tile={tile}
                  inventory={inventory}
                  weather={weather}
                  energy={energy}
                  onTileClick={handleTileClick}
                />
              ))}
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto mb-2">
            <InventoryBar inventory={inventory} />
          </div>

          <StatusFooter
            hp={hp}
            maxHp={MAX_HP}
            energy={energy}
            maxEnergy={MAX_ENERGY}
            currentLoad={currentLoad}
            maxCapacity={maxCapacity}
            avatar={getAvatarFace(hp, MAX_HP, energy, MAX_ENERGY)}
            onRest={handleRest}
          />
        </section>

        <WorkshopPanel
          inventory={inventory}
          logs={logs}
          onCraft={craftItem}
        />
      </main>

      {/* Rest Report Modal */}
      {restReport && <RestReportModal report={restReport} onClose={applyRestResults} />}

    </div>
  );
}
