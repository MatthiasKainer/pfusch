// game-worker.js - Web Worker for game engine computations
// Handles: AI, pathfinding, combat resolution, fog of war, resource calculations

const TERRAIN_TYPES = {
  PLAINS: { id: 'plains', moveCost: 1, defense: 0, resourceMod: 1 },
  FOREST: { id: 'forest', moveCost: 2, defense: 1, resourceMod: 0.8 },
  HILLS: { id: 'hills', moveCost: 2, defense: 2, resourceMod: 1.2 },
  MOUNTAINS: { id: 'mountains', moveCost: 3, defense: 3, resourceMod: 0.5 },
  WATER: { id: 'water', moveCost: Infinity, defense: 0, resourceMod: 0 },
  MARSH: { id: 'marsh', moveCost: 3, defense: -1, resourceMod: 0.6 }
};

const MILL_TYPES = {
  CASTLE_MILL: {
    id: 'castle_mill',
    name: 'Castle Mill',
    produces: { food: 3 },
    consumes: {},
    upgradeable: false
  },
  GRAIN_MILL: {
    id: 'grain_mill',
    name: 'Grain Mill',
    produces: { food: 5 },
    consumes: {},
    upgradeable: true
  },
  FORGE: {
    id: 'forge',
    name: 'Forge',
    produces: { weapons: 2, tools: 1 },
    consumes: { ore: 2, wood: 1 },
    upgradeable: true,
    unlocks: ['heavy_infantry', 'siege']
  },
  CLOTH_MILL: {
    id: 'cloth_mill',
    name: 'Cloth Mill',
    produces: { clothing: 3 },
    consumes: { food: 1 },
    upgradeable: true,
    unlocks: ['improved_morale']
  },
  LUMBER_MILL: {
    id: 'lumber_mill',
    name: 'Lumber Mill',
    produces: { wood: 4 },
    consumes: {},
    upgradeable: true,
    unlocks: ['outposts', 'bridges']
  },
  STONE_QUARRY: {
    id: 'stone_quarry',
    name: 'Stone Quarry',
    produces: { stone: 3 },
    consumes: { tools: 1 },
    upgradeable: true,
    unlocks: ['fortifications', 'castles']
  },
  MINE: {
    id: 'mine',
    name: 'Iron Mine',
    produces: { ore: 3 },
    consumes: { wood: 1 },
    upgradeable: true,
    unlocks: ['advanced_weapons']
  }
};

const UNIT_TYPES = {
  SCOUT: {
    id: 'scout',
    name: 'Scout',
    attack: 1,
    defense: 1,
    movement: 4,
    vision: 3,
    cost: { food: 1 }
  },
  MILITIA: {
    id: 'militia',
    name: 'Militia',
    attack: 2,
    defense: 2,
    movement: 2,
    vision: 1,
    cost: { food: 2 }
  },
  INFANTRY: {
    id: 'infantry',
    name: 'Infantry',
    attack: 4,
    defense: 3,
    movement: 2,
    vision: 1,
    cost: { food: 2, weapons: 1 }
  },
  HEAVY_INFANTRY: {
    id: 'heavy_infantry',
    name: 'Heavy Infantry',
    attack: 6,
    defense: 5,
    movement: 1,
    vision: 1,
    cost: { food: 3, weapons: 2, clothing: 1 },
    requires: ['forge']
  },
  CAVALRY: {
    id: 'cavalry',
    name: 'Cavalry',
    attack: 5,
    defense: 2,
    movement: 4,
    vision: 2,
    cost: { food: 4, weapons: 1 }
  }
};

// Game state managed by worker
let gameState = null;

// Message handler
self.onmessage = function(e) {
  const { type, payload, requestId } = e.data;
  
  try {
    let result;
    switch (type) {
      case 'INIT_GAME':
        result = initializeGame(payload);
        break;
      case 'GENERATE_MAP':
        result = generateMap(payload);
        break;
      case 'CALCULATE_FOG':
        result = calculateFogOfWar(payload);
        break;
      case 'FIND_PATH':
        result = findPath(payload);
        break;
      case 'RESOLVE_COMBAT':
        result = resolveCombat(payload);
        break;
      case 'PROCESS_TURN':
        result = processTurn(payload);
        break;
      case 'AI_MOVE':
        result = calculateAIMove(payload);
        break;
      case 'CALCULATE_RESOURCES':
        result = calculateResources(payload);
        break;
      case 'CHECK_VICTORY':
        result = checkVictoryConditions(payload);
        break;
      case 'GET_VALID_MOVES':
        result = getValidMoves(payload);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    self.postMessage({ type: `${type}_RESULT`, payload: result, requestId });
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: { message: error.message, stack: error.stack }, requestId });
  }
};

// Initialize game state
function initializeGame({ mapSize, players, difficulty }) {
  const map = generateMap({ width: mapSize, height: mapSize, playerCount: players.length });
  
  // Place castles for each player
  const startPositions = getStartPositions(map, players.length);
  
  const playerStates = players.map((player, index) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    isAI: player.isAI,
    resources: { gold: 20, food: 10, wood: 5, stone: 0, ore: 0, weapons: 0, clothing: 0, tools: 0 },
    mills: [],
    units: [],
    castlePosition: startPositions[index],
    explored: new Set(),
    techUnlocked: [],
    tradeAgreements: [] // { partnerId, give: { resource, amount }, receive: { resource, amount } }
  }));
  
  // Place starting castles and mills
  playerStates.forEach((player, index) => {
    const pos = startPositions[index];
    const tileIndex = pos.y * map.width + pos.x;
    
    map.tiles[tileIndex] = {
      ...map.tiles[tileIndex],
      structure: {
        type: 'castle',
        owner: player.id,
        mill: { ...MILL_TYPES.CASTLE_MILL, owner: player.id }
      }
    };
    
    player.mills.push({
      position: pos,
      type: MILL_TYPES.CASTLE_MILL,
      production: { ...MILL_TYPES.CASTLE_MILL.produces }
    });
    
    // Add starting scout
    player.units.push({
      id: `${player.id}_scout_1`,
      type: UNIT_TYPES.SCOUT,
      position: { x: pos.x + 1, y: pos.y },
      movesLeft: UNIT_TYPES.SCOUT.movement,
      health: 100
    });
    
    // Initial fog reveal around castle
    revealArea(player, pos, 3, map);
  });
  
  gameState = {
    map,
    players: playerStates,
    currentPlayer: 0,
    turn: 1,
    phase: 'PLAYER_TURN',
    difficulty,
    events: []
  };
  
  return gameState;
}

// Map generation using procedural algorithm
function generateMap({ width, height, seed, playerCount = 2 }) {
  const tiles = [];
  const mills = [];
  
  // Simple noise-based terrain generation
  const noise = createNoiseGenerator(seed || Date.now());
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = noise(x * 0.1, y * 0.1);
      const moisture = noise(x * 0.08 + 100, y * 0.08 + 100);
      
      let terrain;
      if (elevation < 0.2) {
        terrain = TERRAIN_TYPES.WATER;
      } else if (elevation < 0.35) {
        terrain = moisture > 0.6 ? TERRAIN_TYPES.MARSH : TERRAIN_TYPES.PLAINS;
      } else if (elevation < 0.6) {
        terrain = moisture > 0.5 ? TERRAIN_TYPES.FOREST : TERRAIN_TYPES.PLAINS;
      } else if (elevation < 0.8) {
        terrain = TERRAIN_TYPES.HILLS;
      } else {
        terrain = TERRAIN_TYPES.MOUNTAINS;
      }
      
      tiles.push({
        x,
        y,
        terrain,
        structure: null,
        units: [],
        resources: calculateTileResources(terrain, x, y, noise)
      });
    }
  }
  
  // Place main mills at strategic locations - enough for all players
  const millCount = Math.floor((width * height) / 80) + (playerCount * 6); // More mills
  const placedMills = placeMainMills(tiles, width, height, millCount, noise, playerCount);
  
  return {
    width,
    height,
    tiles,
    mills: placedMills,
    seed: seed || Date.now()
  };
}

// Simple noise generator
function createNoiseGenerator(seed) {
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  
  // Simple 2D value noise
  const cache = new Map();
  const getValue = (ix, iy) => {
    const key = `${ix},${iy}`;
    if (!cache.has(key)) {
      const oldS = s;
      s = (ix * 374761393 + iy * 668265263 + seed) & 0x7fffffff;
      cache.set(key, random());
      s = oldS;
    }
    return cache.get(key);
  };
  
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    
    const v00 = getValue(ix, iy);
    const v10 = getValue(ix + 1, iy);
    const v01 = getValue(ix, iy + 1);
    const v11 = getValue(ix + 1, iy + 1);
    
    const tx = fx * fx * (3 - 2 * fx);
    const ty = fy * fy * (3 - 2 * fy);
    
    return v00 * (1-tx) * (1-ty) + v10 * tx * (1-ty) + v01 * (1-tx) * ty + v11 * tx * ty;
  };
}

function calculateTileResources(terrain, x, y, noise) {
  const base = {
    wood: terrain === TERRAIN_TYPES.FOREST ? 2 : 0,
    stone: terrain === TERRAIN_TYPES.HILLS || terrain === TERRAIN_TYPES.MOUNTAINS ? 2 : 0,
    ore: 0
  };
  
  // Random ore deposits
  if (noise(x * 0.2 + 50, y * 0.2 + 50) > 0.85) {
    base.ore = Math.floor(noise(x, y) * 3) + 1;
  }
  
  return base;
}

function placeMainMills(tiles, width, height, count, noise, playerCount = 2) {
  const mills = [];
  const minDistance = Math.max(3, Math.floor(Math.sqrt(width * height) / 5)); // Reduced min distance
  const millTypes = [
    MILL_TYPES.GRAIN_MILL,
    MILL_TYPES.FORGE,
    MILL_TYPES.CLOTH_MILL,
    MILL_TYPES.LUMBER_MILL,
    MILL_TYPES.STONE_QUARRY,
    MILL_TYPES.MINE
  ];
  
  // Ensure each mill type appears at least once per player (so everyone has a chance)
  const requiredMills = [];
  for (let p = 0; p < playerCount; p++) {
    millTypes.forEach(type => requiredMills.push(type));
  }
  
  // Add some extra random mills
  const extraCount = Math.max(0, count - requiredMills.length);
  for (let i = 0; i < extraCount; i++) {
    requiredMills.push(millTypes[Math.floor(noise(i * 7, i * 13) * millTypes.length)]);
  }
  
  // Shuffle the required mills for varied placement
  for (let i = requiredMills.length - 1; i > 0; i--) {
    const j = Math.floor(noise(i * 11, i * 17) * (i + 1));
    [requiredMills[i], requiredMills[j]] = [requiredMills[j], requiredMills[i]];
  }
  
  // Place mills
  for (let i = 0; i < requiredMills.length; i++) {
    let attempts = 0;
    let placed = false;
    
    while (!placed && attempts < 200) {
      const x = Math.floor(noise(i * 17 + attempts, attempts * 3) * (width - 4)) + 2;
      const y = Math.floor(noise(attempts * 5, i * 23 + attempts) * (height - 4)) + 2;
      const tile = tiles[y * width + x];
      
      // Check valid placement
      if (tile && 
          tile.terrain !== TERRAIN_TYPES.WATER && 
          tile.terrain !== TERRAIN_TYPES.MOUNTAINS &&
          !tile.structure) {
        
        // Check distance from other mills (relaxed for later mills if struggling)
        const effectiveMinDist = attempts > 100 ? Math.max(2, minDistance - 2) : minDistance;
        const tooClose = mills.some(m => 
          Math.abs(m.x - x) + Math.abs(m.y - y) < effectiveMinDist
        );
        
        if (!tooClose) {
          const millType = requiredMills[i];
          const mill = {
            id: `mill_${i}`,
            x,
            y,
            type: millType,
            owner: null,
            level: 1,
            garrison: 0
          };
          
          mills.push(mill);
          tiles[y * width + x].structure = {
            type: 'mill_site',
            mill
          };
          placed = true;
        }
      }
      attempts++;
    }
    
    // If we couldn't place with distance constraint, force place somewhere valid
    if (!placed) {
      for (let y = 2; y < height - 2 && !placed; y++) {
        for (let x = 2; x < width - 2 && !placed; x++) {
          const tile = tiles[y * width + x];
          if (tile && 
              tile.terrain !== TERRAIN_TYPES.WATER && 
              tile.terrain !== TERRAIN_TYPES.MOUNTAINS &&
              !tile.structure) {
            const millType = requiredMills[i];
            const mill = {
              id: `mill_${i}`,
              x,
              y,
              type: millType,
              owner: null,
              level: 1,
              garrison: 0
            };
            mills.push(mill);
            tiles[y * width + x].structure = { type: 'mill_site', mill };
            placed = true;
          }
        }
      }
    }
  }
  
  console.log(`[Map Gen] Placed ${mills.length} mills for ${playerCount} players:`, 
    millTypes.map(t => `${t.name}: ${mills.filter(m => m.type.id === t.id).length}`).join(', '));
  
  return mills;
}

function getStartPositions(map, playerCount) {
  const positions = [];
  const { width, height, tiles } = map;
  const margin = Math.floor(Math.min(width, height) * 0.15);
  
  const corners = [
    { x: margin, y: margin },
    { x: width - margin - 1, y: margin },
    { x: margin, y: height - margin - 1 },
    { x: width - margin - 1, y: height - margin - 1 }
  ];
  
  for (let i = 0; i < playerCount && i < corners.length; i++) {
    let pos = corners[i];
    
    // Find nearest valid tile
    let found = false;
    for (let r = 0; r < 10 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const tile = tiles[ny * width + nx];
            if (tile.terrain !== TERRAIN_TYPES.WATER && 
                tile.terrain !== TERRAIN_TYPES.MOUNTAINS &&
                !tile.structure) {
              positions.push({ x: nx, y: ny });
              found = true;
            }
          }
        }
      }
    }
  }
  
  return positions;
}

function revealArea(player, center, radius, map) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = center.x + dx;
      const ny = center.y + dy;
      if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
        if (Math.abs(dx) + Math.abs(dy) <= radius * 1.5) {
          player.explored.add(`${nx},${ny}`);
        }
      }
    }
  }
}

// Calculate fog of war for a player
function calculateFogOfWar({ playerId, gameState: gs }) {
  const state = gs || gameState;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { visible: [], explored: [] };
  
  const visible = new Set();
  const { map } = state;
  
  // Units provide vision
  player.units.forEach(unit => {
    const vision = unit.type.vision;
    for (let dy = -vision; dy <= vision; dy++) {
      for (let dx = -vision; dx <= vision; dx++) {
        const nx = unit.position.x + dx;
        const ny = unit.position.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          if (Math.sqrt(dx*dx + dy*dy) <= vision) {
            visible.add(`${nx},${ny}`);
            player.explored.add(`${nx},${ny}`);
          }
        }
      }
    }
  });
  
  // Mills provide vision
  player.mills.forEach(mill => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = mill.position.x + dx;
        const ny = mill.position.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          visible.add(`${nx},${ny}`);
          player.explored.add(`${nx},${ny}`);
        }
      }
    }
  });
  
  return {
    visible: Array.from(visible),
    explored: Array.from(player.explored)
  };
}

// A* pathfinding
function findPath({ start, end, unitType, gameState: gs }) {
  const state = gs || gameState;
  const { map } = state;
  
  const openSet = [{ ...start, g: 0, h: heuristic(start, end), f: heuristic(start, end), parent: null }];
  const closedSet = new Set();
  const cameFrom = new Map();
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(cameFrom, current);
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    const neighbors = getNeighbors(current, map);
    for (const neighbor of neighbors) {
      if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
      
      const tile = map.tiles[neighbor.y * map.width + neighbor.x];
      const moveCost = tile.terrain.moveCost;
      
      if (moveCost === Infinity) continue;
      
      const tentativeG = current.g + moveCost;
      const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      
      if (!existing) {
        const node = {
          ...neighbor,
          g: tentativeG,
          h: heuristic(neighbor, end),
          f: tentativeG + heuristic(neighbor, end)
        };
        openSet.push(node);
        cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + existing.h;
        cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
      }
    }
  }
  
  return null; // No path found
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(pos, map) {
  const neighbors = [];
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  
  for (const [dx, dy] of dirs) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  
  return neighbors;
}

function reconstructPath(cameFrom, current) {
  const path = [{ x: current.x, y: current.y }];
  let key = `${current.x},${current.y}`;
  
  while (cameFrom.has(key)) {
    const prev = cameFrom.get(key);
    path.unshift({ x: prev.x, y: prev.y });
    key = `${prev.x},${prev.y}`;
  }
  
  return path;
}

// Combat resolution
function resolveCombat({ attacker, defender, terrain }) {
  const attackerPower = attacker.type.attack * (attacker.health / 100);
  const defenderPower = defender.type.defense * (defender.health / 100) * (1 + terrain.defense * 0.2);
  
  const attackerRoll = Math.random() * attackerPower;
  const defenderRoll = Math.random() * defenderPower;
  
  const damage = Math.abs(attackerRoll - defenderRoll) * 20 + 10;
  
  let result;
  if (attackerRoll > defenderRoll) {
    defender.health -= damage;
    result = {
      winner: 'attacker',
      attackerDamage: damage * 0.3,
      defenderDamage: damage,
      attackerDestroyed: false,
      defenderDestroyed: defender.health <= 0
    };
    attacker.health -= damage * 0.3;
  } else {
    attacker.health -= damage;
    result = {
      winner: 'defender',
      attackerDamage: damage,
      defenderDamage: damage * 0.3,
      attackerDestroyed: attacker.health <= 0,
      defenderDestroyed: false
    };
    defender.health -= damage * 0.3;
  }
  
  return result;
}

// Process end of turn
// Unit upkeep costs in gold
const UNIT_UPKEEP = {
  scout: 1,
  militia: 2,
  infantry: 3,
  heavy_infantry: 4,
  cavalry: 4
};

function processTurn({ gameState: gs }) {
  const state = gs || gameState;
  
  // Calculate resources for current player
  const currentPlayer = state.players[state.currentPlayer];
  const resourceResult = calculateResources({ playerId: currentPlayer.id, gameState: state });
  currentPlayer.resources = resourceResult.newResources;
  
  // Process trade agreements
  processTradeAgreements(currentPlayer, state.players);
  
  // Process market orders
  processMarketOrders(currentPlayer, state);
  
  // Check gold for army upkeep
  const armyUpkeep = calculateArmyUpkeep(currentPlayer);
  if (currentPlayer.resources.gold < armyUpkeep) {
    // Not enough gold - disband units until we can afford
    disbandUnitsForUpkeep(currentPlayer, state);
  } else {
    // Deduct upkeep
    currentPlayer.resources.gold -= armyUpkeep;
  }
  
  // Reset unit movement
  currentPlayer.units.forEach(unit => {
    unit.movesLeft = unit.type.movement;
  });
  
  // Move to next player
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  
  // If back to first player, increment turn
  if (state.currentPlayer === 0) {
    state.turn++;
    
    // Increment trade agreement durations
    state.players.forEach(p => {
      (p.tradeAgreements || []).forEach(a => {
        a.duration = (a.duration || 0) + 1;
      });
    });
    
    // Check victory conditions
    const victory = checkVictoryConditions({ gameState: state });
    if (victory.winner) {
      state.phase = 'GAME_OVER';
      state.winner = victory.winner;
    }
  }
  
  // If next player is AI, queue AI move
  const nextPlayer = state.players[state.currentPlayer];
  if (nextPlayer.isAI && state.phase !== 'GAME_OVER') {
    state.phase = 'AI_TURN';
  } else {
    state.phase = 'PLAYER_TURN';
  }
  
  return state;
}

// Market trade rates
const MARKET_RATES = {
  food: { buy: 3, sell: 1 },
  wood: { buy: 4, sell: 1 },
  stone: { buy: 5, sell: 2 },
  ore: { buy: 6, sell: 2 },
  weapons: { buy: 8, sell: 3 },
  clothing: { buy: 6, sell: 2 },
  tools: { buy: 7, sell: 3 }
};

function processMarketOrders(player, state) {
  const events = state.events || [];
  const ordersToRemove = [];
  
  (player.marketOrders || []).forEach((order, index) => {
    const rate = MARKET_RATES[order.resource]?.[order.type] || 1;
    const goldAmount = rate * order.amount;
    
    if (order.type === 'buy') {
      // Check if can afford
      if ((player.resources.gold || 0) >= goldAmount) {
        player.resources.gold -= goldAmount;
        player.resources[order.resource] = (player.resources[order.resource] || 0) + order.amount;
      } else {
        // Can't afford - cancel order
        ordersToRemove.push(index);
        events.push({
          type: 'MARKET_ORDER_CANCELLED',
          playerId: player.id,
          message: `Market buy order cancelled: not enough gold for ${order.amount} ${order.resource}`
        });
      }
    } else {
      // Sell - check if have enough resource
      if ((player.resources[order.resource] || 0) >= order.amount) {
        player.resources[order.resource] -= order.amount;
        player.resources.gold = (player.resources.gold || 0) + goldAmount;
      } else {
        // Don't have enough - cancel order
        ordersToRemove.push(index);
        events.push({
          type: 'MARKET_ORDER_CANCELLED',
          playerId: player.id,
          message: `Market sell order cancelled: not enough ${order.resource}`
        });
      }
    }
  });
  
  // Remove failed orders
  if (ordersToRemove.length > 0) {
    player.marketOrders = (player.marketOrders || []).filter((_, i) => !ordersToRemove.includes(i));
  }
  
  state.events = events;
}

function calculateArmyUpkeep(player) {
  let total = 0;
  (player.units || []).forEach(unit => {
    total += UNIT_UPKEEP[unit.type.id] || 1;
  });
  return total;
}

function disbandUnitsForUpkeep(player, state) {
  const events = state.events || [];
  
  // Sort units by cost (most expensive first to disband)
  const sortedUnits = [...(player.units || [])].sort((a, b) => {
    return (UNIT_UPKEEP[b.type.id] || 1) - (UNIT_UPKEEP[a.type.id] || 1);
  });
  
  let gold = player.resources.gold || 0;
  const toKeep = [];
  const disbanded = [];
  
  for (const unit of sortedUnits) {
    const upkeep = UNIT_UPKEEP[unit.type.id] || 1;
    if (gold >= upkeep) {
      gold -= upkeep;
      toKeep.push(unit);
    } else {
      disbanded.push(unit);
    }
  }
  
  if (disbanded.length > 0) {
    player.units = toKeep;
    player.resources.gold = Math.max(0, gold);
    
    const names = disbanded.map(u => u.type.name).join(', ');
    events.push({
      type: 'UNITS_DISBANDED',
      playerId: player.id,
      message: `${player.name} couldn't pay ${disbanded.length} unit(s): ${names}`,
      units: disbanded.length
    });
    state.events = events;
    
    console.log(`[Turn] ${player.name} disbanded ${disbanded.length} units due to lack of gold`);
  }
}

function processTradeAgreements(player, allPlayers) {
  const events = [];
  
  (player.tradeAgreements || []).forEach((agreement, index) => {
    const partner = allPlayers.find(p => p.id === agreement.partnerId);
    if (!partner) return;
    
    // Check if player can fulfill their side
    const giveRes = agreement.give?.resource;
    const giveAmt = agreement.give?.amount || 0;
    const playerHas = player.resources[giveRes] || 0;
    
    // Check if partner can fulfill their side  
    const receiveRes = agreement.receive?.resource;
    const receiveAmt = agreement.receive?.amount || 0;
    const partnerHas = partner.resources[receiveRes] || 0;
    
    // Calculate bonus based on duration
    const duration = agreement.duration || 0;
    const bonus = Math.min(0.5, duration * 0.05); // 5% per turn, max 50%
    const bonusReceiveAmt = Math.floor(receiveAmt * (1 + bonus));
    
    if (playerHas >= giveAmt && partnerHas >= receiveAmt) {
      // Trade succeeds
      player.resources[giveRes] -= giveAmt;
      player.resources[receiveRes] = (player.resources[receiveRes] || 0) + bonusReceiveAmt;
      
      // Partner side (they get the reverse)
      partner.resources[receiveRes] -= receiveAmt;
      partner.resources[giveRes] = (partner.resources[giveRes] || 0) + giveAmt;
      
    } else {
      // Trade fails - penalty
      agreement.failedTurns = (agreement.failedTurns || 0) + 1;
      
      // Penalty: lose some gold and relationship
      const penalty = Math.min(5, agreement.failedTurns * 2);
      player.resources.gold = Math.max(0, (player.resources.gold || 0) - penalty);
      
      // Reset duration bonus on failure
      agreement.duration = Math.max(0, (agreement.duration || 0) - 2);
      
      console.log(`[Trade] Agreement failed for ${player.name}, penalty: ${penalty} gold`);
      
      // Auto-cancel after 3 failures
      if (agreement.failedTurns >= 3) {
        player.tradeAgreements = player.tradeAgreements.filter((_, i) => i !== index);
        partner.tradeAgreements = (partner.tradeAgreements || []).filter(
          a => a.partnerId !== player.id
        );
        console.log(`[Trade] Agreement auto-cancelled after 3 failures`);
      }
    }
  });
}

// Calculate resource production
function calculateResources({ playerId, gameState: gs }) {
  const state = gs || gameState;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { newResources: {}, production: {}, consumption: {} };
  
  const production = { gold: 0, food: 0, wood: 0, stone: 0, ore: 0, weapons: 0, clothing: 0, tools: 0 };
  const consumption = { gold: 0, food: 0, wood: 0, stone: 0, ore: 0, weapons: 0, clothing: 0, tools: 0 };
  
  // Castle base income
  production.gold += 5;  // Tax income
  production.food += 3;  // Castle farms
  
  // Mill production
  player.mills.forEach(mill => {
    const millType = mill.type;
    for (const [resource, amount] of Object.entries(millType.produces)) {
      production[resource] = (production[resource] || 0) + amount;
    }
    for (const [resource, amount] of Object.entries(millType.consumes)) {
      consumption[resource] = (consumption[resource] || 0) + amount;
    }
  });
  
  // Unit food upkeep (gold upkeep handled separately in processTurn)
  player.units.forEach(unit => {
    consumption.food += 1;
  });
  
  // Calculate new totals
  const newResources = { ...player.resources };
  for (const resource of Object.keys(production)) {
    newResources[resource] = Math.max(0, 
      (newResources[resource] || 0) + (production[resource] || 0) - (consumption[resource] || 0)
    );
  }
  
  return { newResources, production, consumption };
}

// AI decision making
function calculateAIMove({ playerId, gameState: gs }) {
  const state = gs || gameState;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { actions: [] };
  
  const actions = [];
  
  // Priority 1: Claim nearby unclaimed mills
  const unclaimedMills = state.map.mills.filter(m => !m.owner);
  
  player.units.forEach(unit => {
    if (unit.movesLeft <= 0) return;
    
    // Find nearest unclaimed mill
    let nearestMill = null;
    let nearestDist = Infinity;
    
    unclaimedMills.forEach(mill => {
      const dist = Math.abs(mill.x - unit.position.x) + Math.abs(mill.y - unit.position.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestMill = mill;
      }
    });
    
    if (nearestMill && nearestDist > 0) {
      const path = findPath({
        start: unit.position,
        end: { x: nearestMill.x, y: nearestMill.y },
        unitType: unit.type,
        gameState: state
      });
      
      if (path && path.length > 1) {
        const moveSteps = Math.min(unit.movesLeft, path.length - 1);
        const targetPos = path[moveSteps];
        
        actions.push({
          type: 'MOVE_UNIT',
          unitId: unit.id,
          from: unit.position,
          to: targetPos
        });
      }
    }
  });
  
  // Priority 2: Build units if resources allow
  if (player.resources.food >= 2) {
    actions.push({
      type: 'BUILD_UNIT',
      unitType: 'MILITIA',
      position: player.castlePosition
    });
  }
  
  return { actions };
}

// Get valid moves for a unit
function getValidMoves({ unitId, playerId, gameState: gs }) {
  const state = gs || gameState;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { moves: [] };
  
  const unit = player.units.find(u => u.id === unitId);
  if (!unit || unit.movesLeft <= 0) return { moves: [] };
  
  const moves = [];
  const visited = new Set();
  const queue = [{ ...unit.position, cost: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.x},${current.y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (current.cost > 0) {
      moves.push({ x: current.x, y: current.y, cost: current.cost });
    }
    
    if (current.cost < unit.movesLeft) {
      const neighbors = getNeighbors(current, state.map);
      for (const neighbor of neighbors) {
        const tile = state.map.tiles[neighbor.y * state.map.width + neighbor.x];
        const moveCost = tile.terrain.moveCost;
        
        if (moveCost !== Infinity && current.cost + moveCost <= unit.movesLeft) {
          queue.push({ ...neighbor, cost: current.cost + moveCost });
        }
      }
    }
  }
  
  return { moves };
}

// Check victory conditions
function checkVictoryConditions({ gameState: gs }) {
  const state = gs || gameState;
  const totalMills = state.map.mills.length;
  
  for (const player of state.players) {
    // Economic victory: control majority of mills
    const controlledMills = state.map.mills.filter(m => m.owner === player.id).length;
    if (controlledMills > totalMills / 2) {
      return { winner: player.id, type: 'ECONOMIC', message: `${player.name} controls the majority of mills!` };
    }
    
    // Military victory: all other players eliminated
    const otherPlayers = state.players.filter(p => p.id !== player.id);
    const allEliminated = otherPlayers.every(p => {
      const hasCastle = p.mills.some(m => m.type.id === 'castle_mill');
      return !hasCastle;
    });
    
    if (allEliminated && state.players.length > 1) {
      return { winner: player.id, type: 'MILITARY', message: `${player.name} has conquered all rivals!` };
    }
  }
  
  return { winner: null };
}

// Utility to serialize state for transfer
function serializeGameState(state) {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      explored: Array.from(p.explored)
    }))
  };
}