/**
 * Game Constants for Civilization Wars
 */

// Player colors (up to 8 players + NPC)
export const PLAYER_COLORS = [
    '#e94560', // Red
    '#4ade80', // Green
    '#60a5fa', // Blue
    '#fbbf24', // Yellow
    '#a78bfa', // Purple
    '#f472b6', // Pink
    '#34d399', // Teal
    '#fb923c', // Orange
    '#888888'  // NPC Gray
];

// Civilization names for random assignment
export const CIV_NAMES = [
    'The Crimson Empire',
    'The Emerald Dominion',
    'The Azure Kingdom',
    'The Golden Horde',
    'The Violet Collective',
    'The Rose Confederacy',
    'The Jade Republic',
    'The Amber Dynasty',
    'The Iron Legion',
    'The Storm Clan',
    'The Shadow Guild',
    'The Frost Tribes'
];

// NPC Strategy types
export const NPC_STRATEGIES = {
    AGGRESSIVE: 'aggressive',    // Focus on high STR, attacks often
    DEFENSIVE: 'defensive',      // Focus on CON, builds walls of cells
    EXPANSIONIST: 'expansionist', // Spreads quickly, lower stats
    ELITE: 'elite',              // Few but powerful cells
    BALANCED: 'balanced'         // Balanced approach
};

// D&D stat ranges (3d6 equivalent distribution)
export const STAT_MIN = 3;
export const STAT_MAX = 18;

// Breeding constants
export const BASE_OFFSPRING_CHANCE = 0.6;    // 60% chance to breed
export const STAT_PENALTY_DIVISOR = 240;     // Higher total stats = lower offspring (try 180?)
export const OFFSPRING_MIN_NEIGHBORS = 2;     // Need at least 2 neighbors to breed
export const OFFSPRING_MAX_NEIGHBORS = 3;     // Too many neighbors = no breeding

// Battle constants
export const BATTLE_STR_WEIGHT = 0.30;       // Strength contribution
export const BATTLE_CON_WEIGHT = 0.20;       // Constitution contribution  
export const BATTLE_DEX_WEIGHT = 0.25;       // Dexterity contribution
export const BATTLE_WIS_WEIGHT = 0.15;       // Wisdom contribution
export const BATTLE_INT_WEIGHT = 0.10;       // Intelligence contribution
export const BATTLE_DICE_RANGE = 6;          // d6 randomness factor
export const EARLY_STR_BOOST_WEIGHT = 0.15;  // Extra STR weight for young cells
export const EARLY_STR_BOOST_TURNS = 30;     // Turns before the STR boost fades out
export const INT_BATTLE_BOOST_DIVISOR = 40000; // Civ lifetime INT scaling (no generation multiplier)
export const WISDOM_TEAMWORK_MULTIPLIER = 0.7; // Teamwork power multiplier at max wisdom
export const CHARISMA_CONVERT_BASE_CHANCE = 0.05; // Base chance to convert a neighbor
export const CHARISMA_CONVERT_BONUS = 0.25;       // Bonus chance at max charisma
export const CHARISMA_CONVERT_DEX_RESIST = 0.2;   // Max conversion reduction from high DEX

// Survival constants (Conway's rules modified - more lenient)
export const SURVIVE_MIN_NEIGHBORS = 1;      // Die of loneliness below this (was 2)
export const SURVIVE_MAX_NEIGHBORS = 5;      // Die of overcrowding above this (was 3)
export const AGE_DEATH_THRESHOLD = 100;      // Max age before death chance (was 50)
export const AGE_DEATH_CHANCE = 0.05;        // 5% death chance per turn after threshold (was 10%)
export const AGE_POWER_PEAK = 1.25;          // Power multiplier for the youngest cells
export const AGE_POWER_FLOOR = 0.6;          // Power multiplier for old cells
export const CIV_SIZE_POWER_BOOST = 0.6;     // Max power bonus at full map control

// Game balance
export const PLACEMENT_PER_TURN = 10;        // Cells placeable per turn (was 5)
export const STARTING_CELLS = 25;            // Initial cells per player (was 10)
export const NPC_CELLS_MULTIPLIER = 1.5;     // NPCs start with more cells

// Mutation constants
export const MUTATION_CHANCE = 0.15;         // 15% chance for stat mutation
export const MUTATION_RANGE = 2;             // ±2 stat points
export const INHERITANCE_VARIANCE_CHANCE = 0.35; // Extra randomness even with strong bias
export const INHERITANCE_VARIANCE_RANGE = 1;     // ±1 stat points for inheritance drift
export const BIAS_JITTER_MIN = 0.4;          // Bias impact multiplier low end
export const BIAS_JITTER_MAX = 1.0;          // Bias impact multiplier high end

// Tactical field types (single-use, triggered by first cell to touch)
export const FIELD_TYPES = [
    {
        id: 'rejuvenilation_fountain',
        name: 'Rejuvenilation Fountain',
        color: '#34d399',
        symbol: 'RF',
        description: 'Resets the age of all cells to 0.'
    },
    {
        id: 'supercell_field',
        name: 'Supercell Field',
        color: '#f59e0b',
        symbol: 'SC',
        description: 'First cell to touch becomes a stat monster.'
    },
    {
        id: 'warforge_obelisk',
        name: 'Warforge Obelisk',
        color: '#ef4444',
        symbol: 'WO',
        description: 'Boosts strength and dexterity.'
    },
    {
        id: 'ironbark_grove',
        name: 'Ironbark Grove',
        color: '#22c55e',
        symbol: 'IG',
        description: 'Bolsters constitution and wisdom.'
    },
    {
        id: 'storm_spire',
        name: 'Storm Spire',
        color: '#38bdf8',
        symbol: 'SS',
        description: 'Sharpens dexterity and intellect.'
    },
    {
        id: 'silver_tongue_plaza',
        name: 'Silver Tongue Plaza',
        color: '#f472b6',
        symbol: 'ST',
        description: 'Charisma and intellect surge.'
    },
    {
        id: 'oracle_pool',
        name: 'Oracle Pool',
        color: '#a78bfa',
        symbol: 'OP',
        description: 'Wisdom and intellect spike.'
    },
    {
        id: 'blood_moon_altar',
        name: 'Blood Moon Altar',
        color: '#b91c1c',
        symbol: 'BM',
        description: 'Powerful melee boost at the cost of aging.'
    },
    {
        id: 'horizon_gate',
        name: 'Horizon Gate',
        color: '#06b6d4',
        symbol: 'HG',
        description: 'Opens a rift that spawns nearby allies.'
    },
    {
        id: 'healing_springs',
        name: 'Healing Springs',
        color: '#10b981',
        symbol: 'HS',
        description: 'Restores youth and fortitude.'
    },
    {
        id: 'plague_bog',
        name: 'Plague Bog',
        color: '#6b7280',
        symbol: 'PB',
        description: 'Weakens and rapidly ages the first cell.'
    },
    {
        id: 'veteran_barracks',
        name: 'Veteran Barracks',
        color: '#f97316',
        symbol: 'VB',
        description: 'Trains balanced frontline stats.'
    },
    {
        id: 'arcane_lens',
        name: 'Arcane Lens',
        color: '#8b5cf6',
        symbol: 'AL',
        description: 'Amplifies intellect, wisdom, and charm.'
    },
    {
        id: 'shadow_rift',
        name: 'Shadow Rift',
        color: '#1f2937',
        symbol: 'SR',
        description: 'Consumes nearby enemy cells.'
    },
    {
        id: 'fertility_shrine',
        name: 'Fertility Shrine',
        color: '#84cc16',
        symbol: 'FS',
        description: 'Temporarily boosts breeding odds.'
    },
    {
        id: 'crystal_harbor',
        name: 'Crystal Harbor',
        color: '#22d3ee',
        symbol: 'CH',
        description: 'Duplicates the first cell into empty space.'
    },
    {
        id: 'equilibrium_nexus',
        name: 'Equilibrium Nexus',
        color: '#e5e7eb',
        symbol: 'EN',
        description: 'Equalizes all stats.'
    },
    {
        id: 'chaos_anvil',
        name: 'Chaos Anvil',
        color: '#e11d48',
        symbol: 'CA',
        description: 'Re-rolls all stats with wild variance.'
    },
    {
        id: 'ember_forge',
        name: 'Ember Forge',
        color: '#fb923c',
        symbol: 'EF',
        description: 'Ignites strength while singeing charm.'
    },
    {
        id: 'frost_garden',
        name: 'Frost Garden',
        color: '#0ea5e9',
        symbol: 'FG',
        description: 'Hardens wisdom and constitution, slows dexterity.'
    }
];
