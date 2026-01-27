// Game Constants and Configuration
export const GAME_CONFIG = {
    TILE_SIZE: 32,
    PLAYER_SPEED: 4,
    DUNGEON_WIDTH: 50,
    DUNGEON_HEIGHT: 50,
    TOWN_WIDTH: 30,
    TOWN_HEIGHT: 25,
    VIEWPORT_TILES_X: 25,
    VIEWPORT_TILES_Y: 19,
};

// D&D Style Stats
export const STATS = {
    STRENGTH: 'strength',      // Melee damage, carry capacity
    DEXTERITY: 'dexterity',    // Ranged damage, dodge chance, crit chance
    CONSTITUTION: 'constitution', // Health, health regen
    INTELLIGENCE: 'intelligence', // Mana, spell damage
    WISDOM: 'wisdom',          // Mana regen, healing power
    CHARISMA: 'charisma',      // Shop prices, quest rewards
};

export const BASE_STATS = {
    [STATS.STRENGTH]: 10,
    [STATS.DEXTERITY]: 10,
    [STATS.CONSTITUTION]: 10,
    [STATS.INTELLIGENCE]: 10,
    [STATS.WISDOM]: 10,
    [STATS.CHARISMA]: 10,
};

// Classes
export const CLASSES = {
    TANK: {
        id: 'tank',
        name: 'Warrior',
        description: 'Masters of melee combat and defense',
        primaryStat: STATS.STRENGTH,
        secondaryStat: STATS.CONSTITUTION,
        baseHealth: 150,
        baseMana: 30,
        weaponTypes: ['sword', 'axe', 'mace'],
        armorTypes: ['heavy'],
        primaryAttack: {
            name: 'Slash',
            damage: '1d8 + STR',
            range: 1.5,
            cooldown: 800,
            manaCost: 0,
        },
        secondaryAttack: {
            name: 'Shield Bash',
            damage: '1d6 + STR/2',
            range: 1.2,
            cooldown: 2000,
            manaCost: 10,
            stun: 1000,
        },
        statBonuses: {
            [STATS.STRENGTH]: 4,
            [STATS.CONSTITUTION]: 3,
            [STATS.DEXTERITY]: -2,
        },
    },
    MAGE: {
        id: 'mage',
        name: 'Mage',
        description: 'Wielders of arcane power',
        primaryStat: STATS.INTELLIGENCE,
        secondaryStat: STATS.WISDOM,
        baseHealth: 80,
        baseMana: 150,
        weaponTypes: ['staff', 'wand', 'orb'],
        armorTypes: ['cloth'],
        primaryAttack: {
            name: 'Fireball',
            damage: '2d6 + INT',
            range: 8,
            cooldown: 1000,
            manaCost: 15,
            projectile: true,
            aoe: 1.5,
        },
        secondaryAttack: {
            name: 'Frost Nova',
            damage: '1d8 + INT/2',
            range: 3,
            cooldown: 3000,
            manaCost: 30,
            slow: 50,
            slowDuration: 3000,
        },
        statBonuses: {
            [STATS.INTELLIGENCE]: 5,
            [STATS.WISDOM]: 3,
            [STATS.CONSTITUTION]: -3,
        },
    },
    RANGER: {
        id: 'ranger',
        name: 'Ranger',
        description: 'Swift hunters with deadly precision',
        primaryStat: STATS.DEXTERITY,
        secondaryStat: STATS.STRENGTH,
        baseHealth: 100,
        baseMana: 60,
        weaponTypes: ['bow', 'crossbow'],
        armorTypes: ['leather'],
        primaryAttack: {
            name: 'Arrow Shot',
            damage: '1d10 + DEX',
            range: 10,
            cooldown: 600,
            manaCost: 0,
            projectile: true,
            requiresAmmo: true,
        },
        secondaryAttack: {
            name: 'Multi-Shot',
            damage: '3x(1d6 + DEX/2)',
            range: 8,
            cooldown: 2500,
            manaCost: 20,
            projectile: true,
            projectileCount: 3,
            requiresAmmo: true,
            ammoCount: 3,
        },
        statBonuses: {
            [STATS.DEXTERITY]: 5,
            [STATS.STRENGTH]: 2,
            [STATS.INTELLIGENCE]: -2,
        },
    },
};

// Creep Types
export const CREEP_TYPES = {
    SKELETON: {
        id: 'skeleton',
        name: 'Skeleton',
        baseHealth: 30,
        baseDamage: 5,
        speed: 2,
        attackRange: 1.2,
        attackCooldown: 1500,
        xpValue: 10,
        weakness: 'holy',
        resistance: 'pierce',
        sprite: 'skeleton',
    },
    ZOMBIE: {
        id: 'zombie',
        name: 'Zombie',
        baseHealth: 50,
        baseDamage: 8,
        speed: 1,
        attackRange: 1.2,
        attackCooldown: 2000,
        xpValue: 15,
        weakness: 'fire',
        resistance: 'cold',
        sprite: 'zombie',
    },
    GHOST: {
        id: 'ghost',
        name: 'Ghost',
        baseHealth: 20,
        baseDamage: 12,
        speed: 3,
        attackRange: 1.5,
        attackCooldown: 1800,
        xpValue: 20,
        weakness: 'holy',
        resistance: 'physical',
        sprite: 'ghost',
    },
    DEMON_IMP: {
        id: 'demon_imp',
        name: 'Demon Imp',
        baseHealth: 25,
        baseDamage: 10,
        speed: 4,
        attackRange: 4,
        attackCooldown: 1200,
        xpValue: 25,
        weakness: 'holy',
        resistance: 'fire',
        ranged: true,
        sprite: 'imp',
    },
    ORC: {
        id: 'orc',
        name: 'Orc Warrior',
        baseHealth: 60,
        baseDamage: 12,
        speed: 2.5,
        attackRange: 1.5,
        attackCooldown: 1400,
        xpValue: 30,
        weakness: 'fire',
        resistance: 'physical',
        sprite: 'orc',
    },
    DARK_MAGE: {
        id: 'dark_mage',
        name: 'Dark Mage',
        baseHealth: 35,
        baseDamage: 18,
        speed: 2,
        attackRange: 7,
        attackCooldown: 2500,
        xpValue: 40,
        weakness: 'physical',
        resistance: 'arcane',
        ranged: true,
        sprite: 'dark_mage',
    },
};

// Boss Types
export const BOSS_TYPES = {
    SKELETON_KING: {
        id: 'skeleton_king',
        name: 'The Skeleton King',
        baseHealth: 500,
        baseDamage: 25,
        speed: 1.5,
        attackRange: 2,
        attackCooldown: 2000,
        goldReward: 200,
        abilities: ['summon_skeletons', 'bone_storm'],
        sprite: 'skeleton_king',
    },
    DEMON_LORD: {
        id: 'demon_lord',
        name: 'Demon Lord',
        baseHealth: 800,
        baseDamage: 35,
        speed: 2,
        attackRange: 3,
        attackCooldown: 1800,
        goldReward: 400,
        abilities: ['hellfire', 'summon_imps'],
        sprite: 'demon_lord',
    },
    LICH: {
        id: 'lich',
        name: 'The Lich',
        baseHealth: 600,
        baseDamage: 45,
        speed: 1,
        attackRange: 8,
        attackCooldown: 2500,
        goldReward: 600,
        abilities: ['death_ray', 'raise_dead', 'frost_aura'],
        sprite: 'lich',
    },
    DRAGON: {
        id: 'dragon',
        name: 'Ancient Dragon',
        baseHealth: 1500,
        baseDamage: 60,
        speed: 2.5,
        attackRange: 5,
        attackCooldown: 3000,
        goldReward: 1000,
        abilities: ['fire_breath', 'tail_swipe', 'take_flight'],
        sprite: 'dragon',
    },
};

// Item Types
export const ITEM_CATEGORIES = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    CONSUMABLE: 'consumable',
    AMMO: 'ammo',
};

export const WEAPON_TYPES = {
    // Tank weapons
    SWORD: { type: 'sword', class: 'tank', slot: 'mainhand', damageType: 'physical' },
    AXE: { type: 'axe', class: 'tank', slot: 'mainhand', damageType: 'physical' },
    MACE: { type: 'mace', class: 'tank', slot: 'mainhand', damageType: 'physical' },
    SHIELD: { type: 'shield', class: 'tank', slot: 'offhand', damageType: null },
    // Mage weapons
    STAFF: { type: 'staff', class: 'mage', slot: 'twohand', damageType: 'arcane' },
    WAND: { type: 'wand', class: 'mage', slot: 'mainhand', damageType: 'arcane' },
    ORB: { type: 'orb', class: 'mage', slot: 'offhand', damageType: null },
    // Ranger weapons
    BOW: { type: 'bow', class: 'ranger', slot: 'twohand', damageType: 'pierce' },
    CROSSBOW: { type: 'crossbow', class: 'ranger', slot: 'twohand', damageType: 'pierce' },
};

export const ARMOR_TYPES = {
    HEAVY: { type: 'heavy', class: 'tank', drBonus: 0.3 },
    LEATHER: { type: 'leather', class: 'ranger', drBonus: 0.15 },
    CLOTH: { type: 'cloth', class: 'mage', drBonus: 0.05 },
};

// Item quality tiers
export const ITEM_QUALITY = {
    COMMON: { id: 'common', color: '#FFFFFF', multiplier: 1.0 },
    UNCOMMON: { id: 'uncommon', color: '#1EFF00', multiplier: 1.25 },
    RARE: { id: 'rare', color: '#0070DD', multiplier: 1.5 },
    EPIC: { id: 'epic', color: '#A335EE', multiplier: 2.0 },
    LEGENDARY: { id: 'legendary', color: '#FF8000', multiplier: 3.0 },
};

// Town buildings
export const TOWN_BUILDINGS = {
    WEAPON_SHOP: {
        id: 'weapon_shop',
        name: "Grimshaw's Armory",
        sells: [ITEM_CATEGORIES.WEAPON],
        npcSprite: 'blacksmith',
    },
    ARMOR_SHOP: {
        id: 'armor_shop',
        name: "Ironhide Outfitters",
        sells: [ITEM_CATEGORIES.ARMOR],
        npcSprite: 'armorer',
    },
    POTION_SHOP: {
        id: 'potion_shop',
        name: "Mystic Brews",
        sells: [ITEM_CATEGORIES.CONSUMABLE],
        npcSprite: 'alchemist',
    },
    AMMO_SHOP: {
        id: 'ammo_shop',
        name: "Fletcher's Point",
        sells: [ITEM_CATEGORIES.AMMO],
        npcSprite: 'fletcher',
    },
    QUEST_BOARD: {
        id: 'quest_board',
        name: 'Quest Board',
        npcSprite: 'board',
    },
    DUNGEON_ENTRANCE: {
        id: 'dungeon_entrance',
        name: 'Dungeon Entrance',
        npcSprite: 'portal',
    },
};

// Damage Types
export const DAMAGE_TYPES = {
    PHYSICAL: 'physical',
    PIERCE: 'pierce',
    FIRE: 'fire',
    COLD: 'cold',
    ARCANE: 'arcane',
    HOLY: 'holy',
    DARK: 'dark',
};

// Game Messages
export const MESSAGES = {
    DEATH: "You have fallen in battle...",
    RESURRECT: "You awaken in the safety of town.",
    BOSS_DEFEATED: "The boss has been vanquished! A new dungeon awaits...",
    QUEST_COMPLETE: "Quest complete! Claim your reward.",
    NOT_ENOUGH_GOLD: "You don't have enough gold.",
    INVENTORY_FULL: "Your inventory is full.",
    LEVEL_TOO_LOW: "You need more power to use this item.",
    NO_AMMO: "You're out of arrows!",
    NO_MANA: "Not enough mana!",
};

// Keybindings
export const KEYBINDS = {
    HEAL_POTION: '1',
    MANA_POTION: '2',
    TELEPORT: 't',
    INVENTORY: 'i',
    QUESTS: 'q',
    MAP: 'm',
};

// Calculate stat modifier (D&D style)
export function getStatModifier(statValue) {
    return Math.floor((statValue - 10) / 2);
}

// Roll dice (e.g., "2d6" returns sum of 2 six-sided dice)
export function rollDice(diceString) {
    const match = diceString.match(/(\d+)d(\d+)/);
    if (!match) return 0;
    const [, count, sides] = match.map(Number);
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

// Calculate damage from damage string (e.g., "2d6 + STR")
export function calculateDamage(damageString, stats) {
    let total = 0;
    const parts = damageString.split('+').map(s => s.trim());
    
    for (const part of parts) {
        if (part.includes('d')) {
            // Dice roll
            const multiplierMatch = part.match(/(\d+)x\(/);
            if (multiplierMatch) {
                const count = parseInt(multiplierMatch[1]);
                const diceMatch = part.match(/\(([^)]+)\)/);
                if (diceMatch) {
                    for (let i = 0; i < count; i++) {
                        total += rollDice(diceMatch[1]);
                    }
                }
            } else {
                total += rollDice(part);
            }
        } else if (part.includes('/')) {
            // Stat with division
            const [stat, divisor] = part.split('/');
            const statKey = stat.trim().toLowerCase();
            const statValue = stats[statKey] || 10;
            total += Math.floor(getStatModifier(statValue) / parseInt(divisor));
        } else {
            // Direct stat reference
            const statKey = part.toLowerCase();
            if (stats[statKey]) {
                total += getStatModifier(stats[statKey]);
            } else if (!isNaN(parseInt(part))) {
                total += parseInt(part);
            }
        }
    }
    
    return Math.max(1, total);
}
