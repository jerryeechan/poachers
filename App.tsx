
import React, { useState, useEffect, useCallback } from 'react';
import {
  GRID_SIZE, MAX_ENERGY, MAX_HP, MAX_TOOL_DURABILITY,
  BASE_CAPACITY, CARRIAGE_CAPACITY_BONUS, RECIPES, TILE_TYPES,
  GAME_CONFIG
} from './constants';

import {
  Resources, Tools, Tile as TileType, ViewState,
  RestReport, WeatherType, LogEntry, GameStats
} from './types';

import { Tile } from './components/Tile';
import { ShopOverlay } from './components/ShopOverlay';
import { RestReportModal } from './components/RestReportModal';
import { GameOverModal } from './components/GameOverModal';
import { Header } from './components/Header';
import { StatusFooter } from './components/StatusFooter';
import { WorkshopPanel } from './components/WorkshopPanel';

// Utilities
import { generateLevel, revealNeighbors } from './utils/map';
import { getAvatarFace, calculateRestOutcome } from './utils/gameplay';

export default function App() {
  // --- Global State ---
  const [station, setStation] = useState(1);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [hp, setHp] = useState(MAX_HP);
  const [gold, setGold] = useState(0);
  const [resources, setResources] = useState<Resources>({ wood: 0, stone: 0, charcoal: 0 });
  const [tools, setTools] = useState<Tools>({ axe: 0, pickaxe: 0, bow: 0 });
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
  const currentLoad = resources.wood + resources.stone + resources.charcoal;
  const maxCapacity = BASE_CAPACITY + (carriageLevel * CARRIAGE_CAPACITY_BONUS);

  // --- Helpers ---
  const addLog = useCallback((text: string, type: LogEntry['type'] = 'neutral') => {
    setLogs(prev => [{ id: Date.now() + Math.random(), text, type }, ...prev].slice(0, 15));
  }, []);

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
    if (tile.cleared && !(tile.type === 'empty' && tile.scavengeLeft > 0)) return;

    const config = TILE_TYPES[tile.type.toUpperCase()];
    const cost = weather === 'windy' ? GAME_CONFIG.ACTIONS.COST_WINDY : GAME_CONFIG.ACTIONS.COST_BASE;

    if (energy < cost) {
      addLog("Exhausted! You need to Rest.", "error");
      return;
    }

    if (config.tool && tools[config.tool as keyof Tools] <= 0) {
      addLog(`Requires ${config.tool}!`, "error");
      return;
    }

    const estimatedLoot = 1;
    if (currentLoad + estimatedLoot > maxCapacity && tile.type !== 'empty') {
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
      setTools(prev => {
        const toolKey = config.tool as keyof Tools;
        const newVal = prev[toolKey] - 1;
        if (newVal === 0) addLog(`Your ${toolKey} broke!`, 'error');
        return { ...prev, [toolKey]: newVal };
      });
    }

    const newGrid = [...grid];
    const targetTile = newGrid.find(t => t.id === tile.id);
    if (!targetTile) return;

    let dropMsg = "";
    let loot = { wood: 0, stone: 0 };

    if (tile.type === 'tree') {
      const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.TREE_VAR) + GAME_CONFIG.MAP.LOOT.TREE_MIN;
      loot.wood = amount;
      targetTile.scavengeLeft = (targetTile.scavengeLeft || 0) - 1;
      dropMsg = `Logging (+${amount} Wood)`;
      if (targetTile.scavengeLeft <= 0) {
        targetTile.cleared = true;
        targetTile.type = 'empty';
      }
    } else if (tile.type === 'rock') {
      const amount = Math.floor(Math.random() * GAME_CONFIG.MAP.LOOT.ROCK_VAR) + GAME_CONFIG.MAP.LOOT.ROCK_MIN;
      loot.stone = amount;
      dropMsg = `Mining (+${amount} Stone)`;
      targetTile.cleared = true;
      targetTile.type = 'empty';
    } else if (tile.type === 'enemy') {
      const hasBow = tools.bow > 0;
      const dmg = Math.max(1, targetTile.attack - (hasBow ? GAME_CONFIG.ACTIONS.BOW_BONUS_DMG : 0));
      setHp(prev => prev - dmg);
      if (hasBow) {
          setTools(prev => ({...prev, bow: prev.bow - 1}));
          if(tools.bow -1 === 0) addLog("Your bow broke!", 'error');
      }

      loot.wood = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_WOOD_MIN;
      loot.stone = Math.floor(Math.random() * GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_VAR) + GAME_CONFIG.MAP.ENEMIES.LOOT_STONE_MIN;
      dropMsg = `Enemy Defeated (HP -${dmg})`;
      targetTile.cleared = true;
      targetTile.type = 'empty';
      setGameStats(prev => ({...prev, enemiesDefeated: prev.enemiesDefeated + 1}));
    } else if (tile.type === 'empty') {
      targetTile.scavengeLeft = (targetTile.scavengeLeft || 0) - 1;
      const roll = Math.random();
      if (roll < GAME_CONFIG.MAP.LOOT.EMPTY_CHANCE_WOOD) {
        loot.wood = 1;
        dropMsg = "Found stray branch (+1 Wood)";
      } else if (roll < GAME_CONFIG.MAP.LOOT.EMPTY_CHANCE_STONE_THRESHOLD) {
        loot.stone = 1;
        dropMsg = "Found loose rock (+1 Stone)";
      } else {
        dropMsg = "Nothing found...";
      }
      if (!targetTile.cleared) targetTile.cleared = true;
    }

    // Add Resources with Capacity check
    const actualLoad = resources.wood + resources.stone + resources.charcoal;
    let addedWood = 0;
    let addedStone = 0;

    if (loot.wood > 0) {
      const space = maxCapacity - actualLoad;
      addedWood = Math.min(loot.wood, space);
    }
    if (loot.stone > 0) {
      const space = maxCapacity - actualLoad - addedWood;
      addedStone = Math.min(loot.stone, space);
    }

    if (addedWood < loot.wood || addedStone < loot.stone) {
      addLog("Cargo full! Some resources discarded.", "warning");
    }

    setResources(prev => ({
      ...prev,
      wood: prev.wood + addedWood,
      stone: prev.stone + addedStone
    }));
    
    // Update Stats
    setGameStats(prev => ({
        ...prev,
        totalWood: prev.totalWood + addedWood,
        totalStone: prev.totalStone + addedStone
    }));

    if (dropMsg) addLog(dropMsg, tile.type === 'enemy' ? 'warning' : 'success');

    // Reveal logic via Utility
    // IMPORTANT: Only reveal neighbors if the current tile is now Walkable/Transparent (Empty/Cleared)
    // This prevents "X-Ray Vision" where hitting a tree reveals what's behind it before it's gone.
    let newlyRevealed: TileType[] = [];
    if (targetTile.cleared || targetTile.type === 'empty') {
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
    // Resource Check
    const inputWood = recipe.input.wood || 0;
    const inputStone = recipe.input.stone || 0;

    if (resources.wood < inputWood || resources.stone < inputStone) {
      addLog("Insufficient resources", "error");
      return;
    }

    // Capacity Check for Charcoal
    if (recipe.output.charcoal) {
      const inputWeight = inputWood + inputStone;
      const outputWeight = recipe.output.charcoal;
      if (currentLoad - inputWeight + outputWeight > maxCapacity) {
        addLog("Cargo capacity insufficient!", "error");
        return;
      }
    }

    setResources(prev => ({
      ...prev,
      wood: prev.wood - inputWood,
      stone: prev.stone - inputStone
    }));
    
    setGameStats(prev => ({...prev, itemsCrafted: prev.itemsCrafted + 1}));

    if (recipe.output.tool) {
      setTools(prev => ({ ...prev, [recipe.output.tool!]: MAX_TOOL_DURABILITY }));
      addLog(`Crafted: ${key}`, "success");
    } else if (recipe.output.charcoal) {
      setResources(prev => ({ ...prev, charcoal: prev.charcoal + recipe.output.charcoal! }));
      addLog("Refined Charcoal", "success");
    }
  };

  const addFuel = (type: 'wood' | 'charcoal') => {
    if (pressure >= targetPressure) return;
    
    if (type === 'wood') {
      if (resources.wood < 1) { addLog("No Wood", "error"); return; }
      setResources(prev => ({ ...prev, wood: prev.wood - 1 }));
      setPressure(prev => Math.min(prev + GAME_CONFIG.TRAIN.FUEL_GAIN_WOOD, targetPressure));
    } else {
      if (resources.charcoal < 1) { addLog("No Charcoal", "error"); return; }
      setResources(prev => ({ ...prev, charcoal: prev.charcoal - 1 }));
      setPressure(prev => Math.min(prev + GAME_CONFIG.TRAIN.FUEL_GAIN_CHARCOAL, targetPressure));
    }
  };

  const depart = () => {
    setViewState('shop');
    addLog("Arrived at Trading Post...", "important");
  };

  const nextLevel = () => {
    setStation(prev => prev + 1);
    setGameStats(prev => ({...prev, stationsPassed: prev.stationsPassed + 1}));
    setPressure(0);
    setEnergy(prev => Math.floor(prev * GAME_CONFIG.LEVEL_TRANSITION.ENERGY_RETAIN_PCT));
    setViewState('map');
    setGrid([]);
  };

  // Shop Functions
  const sellResource = (type: keyof Resources) => {
    if (resources[type] > 0) {
      setResources(prev => ({ ...prev, [type]: prev[type] - 1 }));
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
      if(hp >= MAX_HP && energy >= MAX_ENERGY) {
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
    setResources({ wood: 0, stone: 0, charcoal: 0 });
    setTools({ axe: 0, pickaxe: 0, bow: 0 });
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
        resources={resources}
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
            resources={resources}
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
                <div className="grid grid-cols-8 gap-1.5 sm:gap-2 p-4 bg-stone-900 rounded-2xl shadow-2xl border border-stone-800">
                    {grid.map((tile) => (
                        <Tile 
                          key={tile.id} 
                          tile={tile} 
                          tools={tools}
                          weather={weather} 
                          energy={energy}
                          onTileClick={handleTileClick} 
                        />
                    ))}
                </div>
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
          resources={resources}
          tools={tools}
          logs={logs}
          onCraft={craftItem}
        />
      </main>

      {/* Rest Report Modal */}
      {restReport && <RestReportModal report={restReport} onClose={applyRestResults} />}

    </div>
  );
}
