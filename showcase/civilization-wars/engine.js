/**
 * Core Game Engine for Civilization Wars
 * Handles all game logic, breeding, battles, and simulation
 */

import {
    PLAYER_COLORS,
    CIV_NAMES,
    NPC_STRATEGIES,
    STAT_MIN,
    STAT_MAX,
    BASE_OFFSPRING_CHANCE,
    STAT_PENALTY_DIVISOR,
    OFFSPRING_MIN_NEIGHBORS,
    OFFSPRING_MAX_NEIGHBORS,
    BATTLE_STR_WEIGHT,
    BATTLE_CON_WEIGHT,
    BATTLE_DEX_WEIGHT,
    BATTLE_WIS_WEIGHT,
    BATTLE_INT_WEIGHT,
    BATTLE_DICE_RANGE,
    INT_BATTLE_BOOST_DIVISOR,
    WISDOM_TEAMWORK_MULTIPLIER,
    CHARISMA_CONVERT_BASE_CHANCE,
    CHARISMA_CONVERT_BONUS,
    SURVIVE_MIN_NEIGHBORS,
    SURVIVE_MAX_NEIGHBORS,
    AGE_DEATH_THRESHOLD,
    AGE_DEATH_CHANCE,
    AGE_POWER_PEAK,
    AGE_POWER_FLOOR,
    CIV_SIZE_POWER_BOOST,
    PLACEMENT_PER_TURN,
    STARTING_CELLS,
    NPC_CELLS_MULTIPLIER,
    MUTATION_CHANCE,
    MUTATION_RANGE,
    INHERITANCE_VARIANCE_CHANCE,
    INHERITANCE_VARIANCE_RANGE,
    BIAS_JITTER_MIN,
    BIAS_JITTER_MAX,
    FIELD_TYPES
} from './constants.js';

const FIELD_DEFINITIONS = Object.fromEntries(
    FIELD_TYPES.map(field => [field.id, field])
);
const STAT_KEYS = ['str', 'con', 'dex', 'chr', 'wis', 'int'];
const SUPER_STAT_VALUE = 30;
const FIELD_BREEDING_BOOST = 0.2;
const FIELD_BREEDING_BOOST_TURNS = 5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeBiases = (biases) => {
    const normalized = {};
    STAT_KEYS.forEach(key => {
        normalized[key] = clamp(biases?.[key] ?? 0, -3, 3);
    });
    let total = STAT_KEYS.reduce((sum, key) => sum + normalized[key], 0);
    if (total <= 0) return normalized;
    let remaining = total;
    STAT_KEYS.forEach(key => {
        const value = normalized[key];
        if (value > 0 && remaining > 0) {
            const reduction = Math.min(value, remaining);
            normalized[key] = value - reduction;
            remaining -= reduction;
        }
    });
    return normalized;
};

/**
 * Represents a single cell/creature in the game
 */
class Cell {
    constructor(owner, stats = null) {
        this.owner = owner;
        this.age = 0;
        
        // D&D stats - either provided or randomly generated (3d6 style)
        if (stats) {
            this.str = stats.str;
            this.con = stats.con;
            this.dex = stats.dex;
            this.chr = stats.chr;
            this.wis = stats.wis;
            this.int = stats.int;
        } else {
            this.str = this.roll3d6();
            this.con = this.roll3d6();
            this.dex = this.roll3d6();
            this.chr = this.roll3d6();
            this.wis = this.roll3d6();
            this.int = this.roll3d6();
        }
    }
    
    roll3d6() {
        return Math.floor(Math.random() * 6) + 1 +
               Math.floor(Math.random() * 6) + 1 +
               Math.floor(Math.random() * 6) + 1;
    }
    
    get totalStats() {
        return this.str + this.con + this.dex + this.chr + this.wis + this.int;
    }

    getAgeMultiplier() {
        const ratio = Math.min(1, this.age / AGE_DEATH_THRESHOLD);
        return AGE_POWER_PEAK - (AGE_POWER_PEAK - AGE_POWER_FLOOR) * ratio;
    }
    
    /**
     * Calculate combat power with weighted stats and randomness
     */
    getCombatPower() {
        const basePower = 
            this.str * BATTLE_STR_WEIGHT +
            this.con * BATTLE_CON_WEIGHT +
            this.dex * BATTLE_DEX_WEIGHT +
            this.wis * BATTLE_WIS_WEIGHT +
            this.int * BATTLE_INT_WEIGHT;
        
        // Add d6 randomness (luck factor)
        const luck = Math.floor(Math.random() * BATTLE_DICE_RANGE) + 1;
        const ageMultiplier = this.getAgeMultiplier();
        
        return (basePower + luck) * ageMultiplier;
    }
    
    /**
     * Calculate breeding chance - higher stats = lower chance
     */
    getBreedingChance() {
        const statPenalty = this.totalStats / STAT_PENALTY_DIVISOR;
        return Math.max(0.05, BASE_OFFSPRING_CHANCE - statPenalty);
    }
    
    /**
     * Create offspring by inheriting stats from parents with mutation and bias
     */
    static breed(parent1, parent2, owner, bias = null) {
        const inheritStat = (p1Stat, p2Stat, statBias = 0) => {
            // Inherit from one parent or average
            let stat;
            const roll = Math.random();
            if (roll < 0.4) stat = p1Stat;
            else if (roll < 0.8) stat = p2Stat;
            else stat = Math.round((p1Stat + p2Stat) / 2);
            
            // Apply breeding bias
            if (bias && statBias) {
                const jitter = BIAS_JITTER_MIN + Math.random() * (BIAS_JITTER_MAX - BIAS_JITTER_MIN);
                stat += Math.round(statBias * jitter);
            }
            
            if (Math.random() < INHERITANCE_VARIANCE_CHANCE) {
                stat += Math.floor(Math.random() * (INHERITANCE_VARIANCE_RANGE * 2 + 1)) - INHERITANCE_VARIANCE_RANGE;
            }
            
            // Apply mutation
            if (Math.random() < MUTATION_CHANCE) {
                stat += Math.floor(Math.random() * (MUTATION_RANGE * 2 + 1)) - MUTATION_RANGE;
            }
            
            return Math.max(STAT_MIN, Math.min(STAT_MAX, stat));
        };
        
        return new Cell(owner, {
            str: inheritStat(parent1.str, parent2.str, bias?.str),
            con: inheritStat(parent1.con, parent2.con, bias?.con),
            dex: inheritStat(parent1.dex, parent2.dex, bias?.dex),
            chr: inheritStat(parent1.chr, parent2.chr, bias?.chr),
            wis: inheritStat(parent1.wis, parent2.wis, bias?.wis),
            int: inheritStat(parent1.int, parent2.int, bias?.int)
        });
    }
    
    toJSON() {
        return {
            owner: this.owner,
            age: this.age,
            str: this.str,
            con: this.con,
            dex: this.dex,
            chr: this.chr,
            wis: this.wis,
            int: this.int
        };
    }
    
    static fromJSON(data) {
        const cell = new Cell(data.owner, {
            str: data.str,
            con: data.con,
            dex: data.dex,
            chr: data.chr,
            wis: data.wis,
            int: data.int
        });
        cell.age = data.age;
        return cell;
    }
}

/**
 * Represents a player (human or NPC)
 */
class Player {
    constructor(id, name, colorIndex, isNPC = false, strategy = null) {
        this.id = id;
        this.name = name;
        this.colorIndex = colorIndex;
        this.isNPC = isNPC;
        this.strategy = strategy || (isNPC ? this.randomStrategy() : null);
        this.cellCount = 0;
        this.placementsThisTurn = 0;
        this.breedingBias = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
        this.breedingBoostTurns = 0;
        this.births = 0;
        this.deaths = 0;
        this.battlesWon = 0;
        this.battlesLost = 0;
        this.totalStats = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
        this.avgStats = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
        this.totalIntLifetime = 0;
    }
    
    randomStrategy() {
        const strategies = Object.values(NPC_STRATEGIES);
        return strategies[Math.floor(Math.random() * strategies.length)];
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            colorIndex: this.colorIndex,
            isNPC: this.isNPC,
            strategy: this.strategy,
            cellCount: this.cellCount,
            breedingBias: this.breedingBias,
            breedingBoostTurns: this.breedingBoostTurns,
            births: this.births,
            deaths: this.deaths,
            battlesWon: this.battlesWon,
            battlesLost: this.battlesLost,
            totalIntLifetime: this.totalIntLifetime
        };
    }
    
    static fromJSON(data) {
        const player = new Player(data.id, data.name, data.colorIndex, data.isNPC, data.strategy);
        player.cellCount = data.cellCount;
        player.breedingBias = normalizeBiases(data.breedingBias);
        player.breedingBoostTurns = data.breedingBoostTurns || 0;
        player.births = data.births || 0;
        player.deaths = data.deaths || 0;
        player.battlesWon = data.battlesWon || 0;
        player.battlesLost = data.battlesLost || 0;
        player.totalIntLifetime = data.totalIntLifetime || 0;
        return player;
    }
}

/**
 * Main game engine
 */
export class GameEngine {
    constructor(config) {
        this.gridSize = config.gridSize || 100;
        this.grid = [];
        this.players = [];
        this.currentPlayer = 0;
        this.generation = 0;
        this.fields = [];
        this.fieldMap = new Map();
        this.fieldDefinitions = FIELD_DEFINITIONS;
        this.history = [];
        this.gameOver = null;
        this.fibA = 1;
        this.fibB = 1;
        this.isBursting = false;
        this.roundOrder = [];
        this.roundIndex = 0;
        this.autoSimTriggered = false;
        this.stats = {
            births: 0,
            deaths: 0,
            battles: 0
        };
        
        if (config.loadedState) {
            this.loadState(config.loadedState);
        } else {
            this.initializeGame(config.playerCount, config.npcCount);
        }
    }
    
    initializeGame(playerCount, npcCount) {
        // Initialize empty grid
        this.grid = Array(this.gridSize).fill(null).map(() => 
            Array(this.gridSize).fill(null)
        );
        
        // Create human players
        const usedNames = new Set();
        for (let i = 0; i < playerCount; i++) {
            let name;
            do {
                name = CIV_NAMES[Math.floor(Math.random() * CIV_NAMES.length)];
            } while (usedNames.has(name));
            usedNames.add(name);
            
            this.players.push(new Player(i, `Player ${i + 1}: ${name}`, i, false));
        }
        
        // Create NPC players
        for (let i = 0; i < npcCount; i++) {
            let name;
            do {
                name = CIV_NAMES[Math.floor(Math.random() * CIV_NAMES.length)];
            } while (usedNames.has(name));
            usedNames.add(name);
            
            const playerId = playerCount + i;
            this.players.push(new Player(playerId, `NPC: ${name}`, playerId % PLAYER_COLORS.length, true));
        }
        
        // Place starting cells for each player
        this.placeStartingCells();

        // Place tactical fields after starting cells
        this.placeFields();

        this.recordHistory();
        this.resetRound({ startAtFirst: true });
    }
    
    placeStartingCells() {
        const spacing = Math.floor(this.gridSize / (this.players.length + 1));
        
        this.players.forEach((player, idx) => {
            // Find a starting position
            const centerX = spacing * (idx % 4 + 1);
            const centerY = spacing * (Math.floor(idx / 4) + 1);
            
            const cellCount = player.isNPC 
                ? Math.floor(STARTING_CELLS * NPC_CELLS_MULTIPLIER)
                : STARTING_CELLS;
            
            // Place cells in a cluster
            let placed = 0;
            const radius = Math.ceil(Math.sqrt(cellCount));
            
            for (let dy = -radius; dy <= radius && placed < cellCount; dy++) {
                for (let dx = -radius; dx <= radius && placed < cellCount; dx++) {
                    const x = (centerX + dx + this.gridSize) % this.gridSize;
                    const y = (centerY + dy + this.gridSize) % this.gridSize;
                    
                    if (!this.grid[y][x] && Math.random() > 0.3) {
                        this.grid[y][x] = this.createCellForPlayer(player);
                        placed++;
                    }
                }
            }
            
        });
        
        this.updateAllPlayerStats();
    }

    initializeFields() {
        this.fields = [];
        this.fieldMap = new Map();
    }

    addField(x, y, type) {
        const key = `${x},${y}`;
        if (this.fieldMap.has(key)) return false;
        const field = { x, y, type };
        this.fields.push(field);
        this.fieldMap.set(key, field);
        return true;
    }

    placeFields() {
        this.initializeFields();
        const participantCount = this.players.length;
        const baseCount = Math.round(participantCount * 2 + this.gridSize / 30);
        const jitter = 0.85 + Math.random() * 0.3;
        const fieldCount = Math.max(6, Math.round(baseCount * jitter));
        const fieldTypes = FIELD_TYPES.map(field => field.id);
        let placed = 0;
        let attempts = 0;
        const maxAttempts = fieldCount * 40;

        while (placed < fieldCount && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            if (this.grid[y][x]) continue;
            if (this.fieldMap.has(`${x},${y}`)) continue;
            const type = fieldTypes[Math.floor(Math.random() * fieldTypes.length)];
            if (this.addField(x, y, type)) {
                placed++;
            }
        }
    }

    getFieldAt(x, y) {
        return this.fieldMap.get(`${x},${y}`) || null;
    }

    getFieldDefinition(type) {
        return this.fieldDefinitions[type] || null;
    }

    getCivSizeMultiplier(ownerId) {
        const player = this.players[ownerId];
        if (!player) return 1;
        const maxCells = this.gridSize * this.gridSize;
        const ratio = maxCells > 0 ? player.cellCount / maxCells : 0;
        return 1 + clamp(ratio, 0, 1) * CIV_SIZE_POWER_BOOST;
    }

    getAlivePlayerIndices() {
        const alive = [];
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].cellCount > 0) alive.push(i);
        }
        return alive;
    }

    resetRound(options = {}) {
        const preserveIndex = options.preserveIndex === true;
        const startAtFirst = options.startAtFirst === true;
        this.roundOrder = this.getAlivePlayerIndices();
        if (this.roundOrder.length === 0) {
            this.roundIndex = 0;
            return;
        }
        if (startAtFirst) {
            this.currentPlayer = this.roundOrder[0];
            this.roundIndex = 0;
            return;
        }
        if (preserveIndex &&
            this.roundIndex >= 0 &&
            this.roundIndex < this.roundOrder.length &&
            this.roundOrder[this.roundIndex] === this.currentPlayer) {
            return;
        }
        if (!this.roundOrder.includes(this.currentPlayer)) {
            this.currentPlayer = this.roundOrder[0];
            this.roundIndex = 0;
            return;
        }
        const idx = this.roundOrder.indexOf(this.currentPlayer);
        this.roundIndex = idx === -1 ? 0 : idx;
    }

    advanceRoundIndex() {
        this.roundIndex += 1;
        if (this.roundIndex >= this.roundOrder.length) {
            return false;
        }
        this.currentPlayer = this.roundOrder[this.roundIndex];
        return true;
    }

    processNpcTurns() {
        while (this.roundOrder.length > 0 && this.roundIndex < this.roundOrder.length) {
            const player = this.players[this.currentPlayer];
            if (!player || player.cellCount === 0) {
                if (!this.advanceRoundIndex()) {
                    this.simulateGenerationBurst();
                    return false;
                }
                continue;
            }
            if (!player.isNPC) return true;
            player.placementsThisTurn = 0;
            this.npcTurn();
            if (!this.advanceRoundIndex()) {
                this.simulateGenerationBurst();
                return false;
            }
        }
        return false;
    }

    recordHistory() {
        const stats = this.getStats();
        this.history.push({
            generation: this.generation,
            avgStats: { ...stats.avgStats },
            totalStats: { ...stats.totalStats },
            totalCells: stats.totalCells,
            civSizes: this.players.map(player => ({
                id: player.id,
                count: player.cellCount
            }))
        });
    }

    getNextGenerationBurst() {
        return this.fibA;
    }

    simulateGenerationBurst() {
        if (this.isBursting) return;
        const burstCount = this.fibA;
        let remaining = burstCount;
        this.isBursting = true;
        
        const finishBurst = () => {
            const nextFib = this.fibA + this.fibB;
            this.fibA = this.fibB;
            this.fibB = nextFib;
            this.isBursting = false;
            this.resetRound({ startAtFirst: true });
            this.processNpcTurns();
            window.dispatchEvent(new CustomEvent('game.stateChanged'));
        };
        
        const step = () => {
            if (this.gameOver || remaining <= 0) {
                finishBurst();
                return;
            }
            this.simulateGeneration();
            remaining--;
            if (this.gameOver || remaining <= 0) {
                finishBurst();
                return;
            }
            setTimeout(step, 50);
        };
        
        step();
    }
    
    createCellForPlayer(player) {
        const cell = new Cell(player.id);
        
        // NPCs have stat biases based on strategy
        if (player.isNPC) {
            switch (player.strategy) {
                case NPC_STRATEGIES.AGGRESSIVE:
                    cell.str = Math.min(STAT_MAX, cell.str + 4);
                    cell.dex = Math.min(STAT_MAX, cell.dex + 2);
                    break;
                case NPC_STRATEGIES.DEFENSIVE:
                    cell.con = Math.min(STAT_MAX, cell.con + 5);
                    cell.wis = Math.min(STAT_MAX, cell.wis + 2);
                    break;
                case NPC_STRATEGIES.EXPANSIONIST:
                    // Lower all stats slightly for faster breeding
                    cell.str = Math.max(STAT_MIN, cell.str - 2);
                    cell.con = Math.max(STAT_MIN, cell.con - 2);
                    break;
                case NPC_STRATEGIES.ELITE:
                    // Boost all stats
                    cell.str = Math.min(STAT_MAX, cell.str + 3);
                    cell.con = Math.min(STAT_MAX, cell.con + 3);
                    cell.dex = Math.min(STAT_MAX, cell.dex + 3);
                    break;
            }
        }
        
        return cell;
    }

    updateAllPlayerStats(grid = this.grid) {
        this.players.forEach(player => {
            player.cellCount = 0;
            player.totalStats = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
            player.avgStats = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
        });
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = grid[y][x];
                if (!cell) continue;
                const player = this.players[cell.owner];
                if (!player) continue;
                player.cellCount++;
                STAT_KEYS.forEach(key => {
                    player.totalStats[key] += cell[key];
                });
            }
        }
        this.players.forEach(player => {
            if (player.cellCount === 0) return;
            STAT_KEYS.forEach(key => {
                player.avgStats[key] = player.totalStats[key] / player.cellCount;
            });
        });
    }

    applyStatDelta(cell, deltas, min = STAT_MIN, max = STAT_MAX) {
        STAT_KEYS.forEach(key => {
            if (typeof deltas[key] !== 'number') return;
            cell[key] = clamp(cell[key] + deltas[key], min, max);
        });
    }

    applyToCivCells(ownerId, grid, applyFn) {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const target = grid[row][col];
                if (target && target.owner === ownerId) {
                    applyFn(target);
                }
            }
        }
    }

    findEmptyNeighbor(grid, x, y) {
        const candidates = this.getNeighborCoords(x, y)
            .filter(([nx, ny]) => !grid[ny][nx]);
        if (candidates.length === 0) return null;
        const [nx, ny] = candidates[Math.floor(Math.random() * candidates.length)];
        return { x: nx, y: ny };
    }

    getCivIntBoost(ownerId) {
        const player = this.players[ownerId];
        if (!player) return 0;
        const totalInt = player.totalIntLifetime || 0;
        return totalInt / INT_BATTLE_BOOST_DIVISOR;
    }

    spawnClone(cell, x, y, grid, delta = 0) {
        const emptyNeighbors = this.getNeighborCoords(x, y)
            .filter(([nx, ny]) => !grid[ny][nx]);
        if (emptyNeighbors.length === 0) return false;
        const [nx, ny] = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
        const stats = {};
        STAT_KEYS.forEach(key => {
            stats[key] = clamp(cell[key] + delta, STAT_MIN, STAT_MAX);
        });
        const clone = new Cell(cell.owner, stats);
        clone.age = 0;
        grid[ny][nx] = clone;
        return true;
    }

    triggerField(field, cell, x, y, grid, context = {}) {
        const def = this.getFieldDefinition(field.type);
        const inSimulation = !!context.inSimulation;
        field.consumed = true;
        this.fieldMap.delete(`${x},${y}`);

        if (def) {
            this.log('info', `Field activated: ${def.name} at (${x},${y})`);
        }

        switch (field.type) {
            case 'rejuvenilation_fountain':
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const target = grid[row][col];
                        if (target) target.age = 0;
                    }
                }
                break;
            case 'supercell_field':
                this.applyToCivCells(cell.owner, grid, target => {
                    STAT_KEYS.forEach(key => { target[key] = SUPER_STAT_VALUE; });
                    target.age = 0;
                });
                break;
            case 'warforge_obelisk':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { str: 10, dex: 4 });
                });
                break;
            case 'ironbark_grove':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { con: 10, wis: 4 });
                });
                break;
            case 'storm_spire':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { dex: 8, int: 6 });
                });
                break;
            case 'silver_tongue_plaza':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { chr: 10, int: 4 });
                });
                break;
            case 'oracle_pool':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { wis: 8, int: 8 });
                });
                break;
            case 'blood_moon_altar':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { str: 10, con: 6 });
                    target.age += 20;
                });
                break;
            case 'horizon_gate':
                this.spawnClone(cell, x, y, grid, -2);
                this.spawnClone(cell, x, y, grid, -2);
                break;
            case 'healing_springs':
                this.applyToCivCells(cell.owner, grid, target => {
                    target.age = 0;
                    this.applyStatDelta(target, { con: 6 });
                });
                break;
            case 'plague_bog':
                this.applyStatDelta(cell, { con: -4, dex: -4, chr: -2 });
                cell.age += 40;
                break;
            case 'veteran_barracks':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { str: 5, con: 5, dex: 5 });
                });
                break;
            case 'arcane_lens':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { int: 6, wis: 6, chr: 4 });
                });
                break;
            case 'shadow_rift': {
                const enemyCoords = this.getNeighborCoords(x, y).filter(([nx, ny]) => {
                    const target = grid[ny][nx];
                    return target && target.owner !== cell.owner;
                });
                enemyCoords.sort(() => Math.random() - 0.5).slice(0, 3).forEach(([nx, ny]) => {
                    grid[ny][nx] = null;
                });
                break;
            }
            case 'fertility_shrine': {
                const player = this.players[cell.owner];
                if (player) {
                    const duration = FIELD_BREEDING_BOOST_TURNS + (inSimulation ? 1 : 0);
                    player.breedingBoostTurns = Math.max(player.breedingBoostTurns, duration);
                }
                break;
            }
            case 'crystal_harbor':
                this.spawnClone(cell, x, y, grid, 0);
                break;
            case 'equilibrium_nexus':
                this.applyToCivCells(cell.owner, grid, target => {
                    STAT_KEYS.forEach(key => { target[key] = 15; });
                });
                break;
            case 'chaos_anvil':
                this.applyToCivCells(cell.owner, grid, target => {
                    STAT_KEYS.forEach(key => { target[key] = Math.floor(Math.random() * 18) + 3; });
                });
                break;
            case 'ember_forge':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { str: 8, dex: 2, chr: -4 });
                });
                break;
            case 'frost_garden':
                this.applyToCivCells(cell.owner, grid, target => {
                    this.applyStatDelta(target, { con: 4, wis: 6, dex: -4 });
                });
                break;
            default:
                break;
        }
    }

    applyFieldTriggers(grid, context = {}) {
        const fieldsToCheck = [...this.fields];
        fieldsToCheck.forEach(field => {
            const cell = grid[field.y]?.[field.x];
            if (!cell) return;
            this.triggerField(field, cell, field.x, field.y, grid, context);
        });
        this.fields = this.fields.filter(field => !field.consumed);
    }

    checkFieldTriggerAt(x, y, grid, context = {}) {
        const field = this.getFieldAt(x, y);
        if (!field) return false;
        const cell = grid[y]?.[x];
        if (!cell) return false;
        this.triggerField(field, cell, x, y, grid, context);
        this.fields = this.fields.filter(f => !f.consumed);
        return true;
    }

    applyCharismaConversions(grid) {
        const conversions = [];
        const targeted = new Set();

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = grid[y][x];
                if (!cell) continue;
                const player = this.players[cell.owner];
                if (!player) continue;
                const avgChr = player.avgStats?.chr || 0;

                const neighbors = this.getNeighborCoords(x, y).sort(() => Math.random() - 0.5);
                for (const [nx, ny] of neighbors) {
                    const target = grid[ny][nx];
                    if (!target || target.owner === cell.owner) continue;
                    const key = `${nx},${ny}`;
                    if (targeted.has(key)) continue;
                    const targetChr = this.players[target.owner]?.avgStats?.chr || 0;
                    const advantage = (avgChr - targetChr) / 18;
                    const chance = clamp(
                        CHARISMA_CONVERT_BASE_CHANCE + advantage * CHARISMA_CONVERT_BONUS,
                        0,
                        0.6
                    );
                    if (Math.random() < chance) {
                        conversions.push({ fromX: x, fromY: y, toX: nx, toY: ny, owner: cell.owner });
                        targeted.add(key);
                        break;
                    }
                }
            }
        }

        let conversionBirths = 0;
        conversions.forEach(conv => {
            const attacker = grid[conv.fromY]?.[conv.fromX];
            const target = grid[conv.toY]?.[conv.toX];
            if (!attacker || !target) return;
            if (attacker.owner !== conv.owner || target.owner === conv.owner) return;

            target.owner = conv.owner;
            const player = this.players[conv.owner];
            if (player) {
                this.log('info', `💞 ${player.name} converted a neighbor at (${conv.toX},${conv.toY})`);
            }

            const spawnAt = this.findEmptyNeighbor(grid, conv.toX, conv.toY)
                || this.findEmptyNeighbor(grid, conv.fromX, conv.fromY);
            if (spawnAt && player) {
                const bias = player.breedingBias || null;
                const baby = Cell.breed(attacker, target, conv.owner, bias);
                grid[spawnAt.y][spawnAt.x] = baby;
                conversionBirths++;
                player.births++;
            }
        });

        return conversionBirths;
    }
    
    /**
     * Place a cell at the given position for the current player
     */
    placeCell(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return false;
        if (this.isBursting) return false;
        
        const player = this.players[this.currentPlayer];
        if (player.isNPC || player.cellCount === 0) return false; // NPCs or defeated players don't manually place
        
        if (player.placementsThisTurn >= PLACEMENT_PER_TURN) {
            this.log('info', `No placements left this turn!`);
            return false;
        }
        
        if (this.grid[y][x]) {
            // Can't place on existing cell
            return false;
        }
        
        // Check if adjacent to own cell (for fair placement)
        const hasAdjacentOwn = this.getNeighbors(x, y).some(n => n?.owner === player.id);
        const isFirstPlacement = player.cellCount < 3;
        
        if (!hasAdjacentOwn && !isFirstPlacement) {
            this.log('info', 'Must place adjacent to your own cells!');
            return false;
        }
        
        this.grid[y][x] = new Cell(player.id);
        player.placementsThisTurn++;
        this.checkFieldTriggerAt(x, y, this.grid, { inSimulation: false });
        this.updateAllPlayerStats();
        
        return true;
    }
    
    /**
     * End current player's turn
     */
    endTurn() {
        if (this.isBursting) return;
        if (this.roundOrder.length === 0) {
            this.resetRound();
        }
        if (this.roundOrder.length === 0) {
            window.dispatchEvent(new CustomEvent('game.stateChanged'));
            return;
        }

        if (this.roundOrder[this.roundIndex] !== this.currentPlayer) {
            const idx = this.roundOrder.indexOf(this.currentPlayer);
            if (idx === -1) {
                this.currentPlayer = this.roundOrder[0];
                this.roundIndex = 0;
            } else {
                this.roundIndex = idx;
            }
        }

        const current = this.players[this.currentPlayer];
        if (!current || current.cellCount === 0) {
            if (!this.advanceRoundIndex()) {
                this.simulateGenerationBurst();
                window.dispatchEvent(new CustomEvent('game.stateChanged'));
                return;
            }
            this.processNpcTurns();
            window.dispatchEvent(new CustomEvent('game.stateChanged'));
            return;
        }

        if (current.isNPC) {
            this.processNpcTurns();
            window.dispatchEvent(new CustomEvent('game.stateChanged'));
            return;
        }

        current.placementsThisTurn = 0;

        if (!this.advanceRoundIndex()) {
            this.simulateGenerationBurst();
            window.dispatchEvent(new CustomEvent('game.stateChanged'));
            return;
        }

        this.processNpcTurns();
        
        window.dispatchEvent(new CustomEvent('game.stateChanged'));
    }
    
    /**
     * NPC AI turn
     */
    npcTurn() {
        const player = this.players[this.currentPlayer];
        if (!player.isNPC) return;
        
        // Find cells adjacent to NPC's territory
        const candidates = [];
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]?.owner === player.id) {
                    // Check neighbors for empty spaces
                    this.getNeighborCoords(x, y).forEach(([nx, ny]) => {
                        if (!this.grid[ny][nx]) {
                            candidates.push({ x: nx, y: ny, priority: 0 });
                        }
                    });
                }
            }
        }
        
        if (candidates.length === 0) return;
        
        // Score candidates based on strategy
        candidates.forEach(c => {
            const neighbors = this.getNeighbors(c.x, c.y);
            const ownNeighbors = neighbors.filter(n => n?.owner === player.id).length;
            const enemyNeighbors = neighbors.filter(n => n && n.owner !== player.id).length;
            
            switch (player.strategy) {
                case NPC_STRATEGIES.AGGRESSIVE:
                    c.priority = enemyNeighbors * 3 + Math.random();
                    break;
                case NPC_STRATEGIES.DEFENSIVE:
                    c.priority = ownNeighbors * 2 - enemyNeighbors + Math.random();
                    break;
                case NPC_STRATEGIES.EXPANSIONIST:
                    c.priority = (8 - ownNeighbors) + Math.random() * 2;
                    break;
                case NPC_STRATEGIES.ELITE:
                    c.priority = ownNeighbors + Math.random();
                    break;
                default:
                    c.priority = Math.random();
            }
        });
        
        // Sort and place cells
        candidates.sort((a, b) => b.priority - a.priority);
        
        for (let i = 0; i < Math.min(PLACEMENT_PER_TURN, candidates.length); i++) {
            const { x, y } = candidates[i];
            this.grid[y][x] = this.createCellForPlayer(player);
            this.checkFieldTriggerAt(x, y, this.grid, { inSimulation: false });
        }
        
        this.updateAllPlayerStats();
    }
    
    /**
     * Simulate one generation (Conway's Game of Life + battles + breeding)
     */
    simulateGeneration() {
        this.generation++;
        const newGrid = Array(this.gridSize).fill(null).map(() => 
            Array(this.gridSize).fill(null)
        );
        
        // Track stats for this generation
        let births = 0;
        let deaths = 0;
        let battles = 0;
        
        // First pass: handle existing cells (survival, aging, battles)
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (!cell) continue;
                
                const neighbors = this.getNeighbors(x, y);
                const aliveNeighbors = neighbors.filter(n => n !== null);
                const ownNeighbors = aliveNeighbors.filter(n => n.owner === cell.owner);
                const enemyNeighbors = aliveNeighbors.filter(n => n.owner !== cell.owner);
                
                // Check Conway's survival rules (modified)
                const survives = ownNeighbors.length >= SURVIVE_MIN_NEIGHBORS && 
                                 ownNeighbors.length <= SURVIVE_MAX_NEIGHBORS;
                
                // Age-based death
                cell.age++;
                const ageDeath = cell.age > AGE_DEATH_THRESHOLD && 
                                 Math.random() < AGE_DEATH_CHANCE;
                
                if (!survives || ageDeath) {
                    deaths++;
                    const owner = this.players[cell.owner];
                    if (owner) owner.deaths++;
                    this.log('death', `Cell died at (${x},${y}) - ${survives ? 'old age' : 'isolation/overcrowding'}`);
                    continue;
                }
                
                // Handle battles with enemy neighbors
                if (enemyNeighbors.length > 0) {
                    const survived = this.resolveBattle(cell, enemyNeighbors, ownNeighbors, x, y);
                    battles++;
                    
                    if (!survived) {
                        deaths++;
                        const owner = this.players[cell.owner];
                        if (owner) owner.deaths++;
                        continue;
                    }
                }
                
                // Cell survives
                newGrid[y][x] = cell;
            }
        }
        
        // Second pass: breeding (cells born in empty spaces)
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] || newGrid[y][x]) continue;
                
                const neighbors = this.getNeighbors(x, y);
                const aliveNeighbors = neighbors.filter(n => n !== null);
                
                // Need exactly 3 neighbors for birth (Conway's rule)
                if (aliveNeighbors.length !== 3) continue;
                
                // Determine which civilization breeds here
                const ownerCounts = {};
                aliveNeighbors.forEach(n => {
                    ownerCounts[n.owner] = (ownerCounts[n.owner] || 0) + 1;
                });
                
                // Majority owner gets to breed
                let dominantOwner = null;
                let maxCount = 0;
                
                for (const [owner, count] of Object.entries(ownerCounts)) {
                    if (count > maxCount || (count === maxCount && Math.random() > 0.5)) {
                        dominantOwner = parseInt(owner);
                        maxCount = count;
                    }
                }
                
                if (dominantOwner === null) continue;
                
                // Get parent cells and check breeding chance
                const parents = aliveNeighbors.filter(n => n.owner === dominantOwner);
                if (parents.length < 2) continue;
                
                const parent1 = parents[0];
                const parent2 = parents[1];
                
                // Calculate combined breeding chance
                const player = this.players[dominantOwner];
                const breedingBoost = player?.breedingBoostTurns > 0 ? FIELD_BREEDING_BOOST : 0;
                const baseChance = (parent1.getBreedingChance() + parent2.getBreedingChance()) / 2;
                const breedChance = Math.min(1, baseChance + breedingBoost);
                
                if (Math.random() < breedChance) {
                    const bias = player?.breedingBias || null;
                    newGrid[y][x] = Cell.breed(parent1, parent2, dominantOwner, bias);
                    births++;
                    if (player) player.births++;
                    this.log('birth', `New cell born at (${x},${y}) for ${this.players[dominantOwner].name}`);
                }
            }
        }

        // Apply field effects after births/survival
        this.applyFieldTriggers(newGrid, { inSimulation: true });

        this.updateAllPlayerStats(newGrid);
        this.players.forEach(player => {
            player.totalIntLifetime += player.totalStats.int;
        });
        births += this.applyCharismaConversions(newGrid);
        
        // Update grid and stats
        this.grid = newGrid;
        this.stats.births += births;
        this.stats.deaths += deaths;
        this.stats.battles += battles;
        
        // Update all player cell counts
        this.updateAllPlayerStats();
        this.players.forEach(p => {
            if (p.breedingBoostTurns > 0) p.breedingBoostTurns--;
        });

        this.recordHistory();
        this.resetRound({ startAtFirst: true });
        
        // Check for victory/elimination
        this.checkGameEnd();
        
        window.dispatchEvent(new CustomEvent('game.stateChanged'));
    }
    
    /**
     * Resolve battle between a cell and enemy neighbors
     */
    resolveBattle(cell, enemies, allies, x, y) {
        const ownMultiplier = this.getCivSizeMultiplier(cell.owner);
        const ownIntBoost = this.getCivIntBoost(cell.owner);
        const cellPower = (cell.getCombatPower() + ownIntBoost) * ownMultiplier;
        const allyPower = allies.reduce((sum, ally) => {
            return sum + (ally.getCombatPower() + ownIntBoost) * ownMultiplier;
        }, 0);
        let enemyPower = 0;
        let maxEnemyPower = 0;
        let strongestEnemy = null;
        
        enemies.forEach(enemy => {
            const enemyMultiplier = this.getCivSizeMultiplier(enemy.owner);
            const enemyIntBoost = this.getCivIntBoost(enemy.owner);
            const power = (enemy.getCombatPower() + enemyIntBoost) * enemyMultiplier;
            enemyPower += power;
            if (power > maxEnemyPower) {
                maxEnemyPower = power;
                strongestEnemy = enemy;
            }
        });
        
        // Combat resolution
        const cellBonus = cell.con * 0.1; // Constitution gives defense bonus
        const allyCount = allies.length + 1;
        let cellTotal = cellPower + allyPower + cellBonus;
        if (allyCount > 1) {
            const allyWis = this.players[cell.owner]?.avgStats?.wis || 0;
            const wisdomMultiplier = 1 + (allyWis / 18) * WISDOM_TEAMWORK_MULTIPLIER;
            cellTotal *= wisdomMultiplier;
        }
        
        let enemyTotal = enemyPower;
        if (enemies.length > 1) {
            const enemyWisSum = enemies.reduce((sum, enemy) => {
                return sum + (this.players[enemy.owner]?.avgStats?.wis || 0);
            }, 0);
            const enemyWis = enemyWisSum / enemies.length;
            const wisdomMultiplier = 1 + (enemyWis / 18) * WISDOM_TEAMWORK_MULTIPLIER;
            enemyTotal *= wisdomMultiplier;
        }
        
        const survived = cellTotal >= enemyTotal;

        const defender = this.players[cell.owner];
        if (survived) {
            if (defender) defender.battlesWon++;
            if (strongestEnemy) {
                const attacker = this.players[strongestEnemy.owner];
                if (attacker) attacker.battlesLost++;
            }
        } else {
            if (defender) defender.battlesLost++;
            if (strongestEnemy) {
                const attacker = this.players[strongestEnemy.owner];
                if (attacker) attacker.battlesWon++;
            }
        }
        
        this.log('battle', survived 
            ? `⚔️ Cell at (${x},${y}) defended successfully!`
            : `💀 Cell at (${x},${y}) was defeated by ${this.players[strongestEnemy.owner].name}`
        );

        if (!survived) {
            const color = PLAYER_COLORS[defender?.colorIndex ?? 0];
            window.dispatchEvent(new CustomEvent('game.cellExplode', {
                detail: { x, y, color }
            }));
        }
        
        return survived;
    }
    
    /**
     * Get all 8 neighbors of a cell
     */
    getNeighbors(x, y) {
        return this.getNeighborCoords(x, y).map(([nx, ny]) => this.grid[ny][nx]);
    }
    
    getNeighborCoords(x, y) {
        const coords = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + this.gridSize) % this.gridSize;
                const ny = (y + dy + this.gridSize) % this.gridSize;
                coords.push([nx, ny]);
            }
        }
        return coords;
    }
    
    getCell(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return null;
        return this.grid[y][x];
    }
    
    updatePlayerCellCount(playerId) {
        this.updateAllPlayerStats();
    }
    
    getPlacementsLeft() {
        const player = this.players[this.currentPlayer];
        if (player.isNPC || player.cellCount === 0) return 0;
        return PLACEMENT_PER_TURN - player.placementsThisTurn;
    }
    
    checkGameEnd() {
        const alivePlayers = this.players.filter(p => p.cellCount > 0);
        const aliveHumans = alivePlayers.filter(p => !p.isNPC);
        if (this.gameOver) return;
        
        if (alivePlayers.length === 1) {
            const winner = alivePlayers[0];
            this.log('info', `🏆 ${winner.name} has won the game!`);
            this.gameOver = this.buildGameOverSummary(winner.id);
            window.dispatchEvent(new CustomEvent('game.over', { detail: this.gameOver }));
        } else if (aliveHumans.length === 0 && alivePlayers.length > 0) {
            this.log('info', `💀 All human players eliminated! NPCs continue...`);
            if (!this.autoSimTriggered) {
                this.autoSimTriggered = true;
                window.dispatchEvent(new CustomEvent('game.autosimulate', { detail: { enabled: true } }));
            }
        }
    }

    buildGameOverSummary(winnerId) {
        const players = this.players.map(player => ({
            id: player.id,
            name: player.name,
            colorIndex: player.colorIndex,
            isNPC: player.isNPC,
            cellCount: player.cellCount,
            births: player.births,
            deaths: player.deaths,
            battlesWon: player.battlesWon,
            battlesLost: player.battlesLost
        }));
        return {
            winnerId,
            winner: this.players[winnerId]?.name || 'Unknown',
            players,
            history: [...this.history]
        };
    }
    
    getStats() {
        let totalCells = 0;
        const statSums = { str: 0, con: 0, dex: 0, chr: 0, wis: 0, int: 0 };
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell) {
                    totalCells++;
                    statSums.str += cell.str;
                    statSums.con += cell.con;
                    statSums.dex += cell.dex;
                    statSums.chr += cell.chr;
                    statSums.wis += cell.wis;
                    statSums.int += cell.int;
                }
            }
        }
        
        const avgStats = totalCells > 0 ? {
            str: Math.round(statSums.str / totalCells),
            con: Math.round(statSums.con / totalCells),
            dex: Math.round(statSums.dex / totalCells),
            chr: Math.round(statSums.chr / totalCells),
            wis: Math.round(statSums.wis / totalCells),
            int: Math.round(statSums.int / totalCells)
        } : statSums;
        
        return {
            totalCells,
            births: this.stats.births,
            deaths: this.stats.deaths,
            battles: this.stats.battles,
            avgStats,
            totalStats: statSums
        };
    }
    
    log(type, message) {
        window.dispatchEvent(new CustomEvent('game.battleLog', {
            detail: { type, message, generation: this.generation }
        }));
    }
    
    /**
     * Export game state as JSON
     */
    exportState() {
        const state = {
            version: 1,
            gridSize: this.gridSize,
            generation: this.generation,
            currentPlayer: this.currentPlayer,
            roundIndex: this.roundIndex,
            stats: this.stats,
            players: this.players.map(p => p.toJSON()),
            fields: this.fields.map(field => ({
                x: field.x,
                y: field.y,
                type: field.type
            })),
            fibA: this.fibA,
            fibB: this.fibB,
            history: this.history,
            grid: []
        };
        
        // Sparse grid encoding for efficiency
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell) {
                    state.grid.push({ x, y, ...cell.toJSON() });
                }
            }
        }
        
        return JSON.stringify(state, null, 2);
    }
    
    /**
     * Load game state from JSON
     */
    loadState(data) {
        this.gridSize = data.gridSize;
        this.generation = data.generation;
        this.currentPlayer = data.currentPlayer;
        this.roundIndex = data.roundIndex || 0;
        this.stats = data.stats;
        
        // Initialize empty grid
        this.grid = Array(this.gridSize).fill(null).map(() => 
            Array(this.gridSize).fill(null)
        );
        
        // Load players
        this.players = data.players.map(p => Player.fromJSON(p));

        // Load cells from sparse encoding
        data.grid.forEach(cellData => {
            this.grid[cellData.y][cellData.x] = Cell.fromJSON(cellData);
        });

        this.initializeFields();
        if (data.fields && data.fields.length) {
            data.fields.forEach(field => {
                this.addField(field.x, field.y, field.type);
            });
        } else {
            this.placeFields();
        }
        
        // Update cell counts
        this.updateAllPlayerStats();

        this.history = Array.isArray(data.history) ? data.history : [];
        if (this.history.length === 0) {
            this.recordHistory();
        }

        this.fibA = data.fibA || 1;
        this.fibB = data.fibB || 1;
        this.autoSimTriggered = false;
        this.resetRound({ preserveIndex: true });
        if (this.roundIndex < 0 || this.roundIndex >= this.roundOrder.length) {
            this.roundIndex = this.roundOrder.indexOf(this.currentPlayer);
            if (this.roundIndex === -1) this.roundIndex = 0;
        }
    }
}
