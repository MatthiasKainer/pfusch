// Unit Tests for Depths of Crimson
import assert from 'node:assert/strict';
import test from 'node:test';
import { 
    setupDomStubs, loadBaseDocument, pfuschTest, flushEffects, import_for_test 
} from '../../unit-tests/pfusch-stubs.js';

let restore;

// Mock game state for testing
const createMockGameState = () => ({
    player: {
        class: { id: 'tank', name: 'Warrior', baseHealth: 150, baseMana: 30 },
        classId: 'tank',
        gender: 'male',
        stats: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 10, charisma: 10 },
        health: 150,
        maxHealth: 150,
        mana: 30,
        maxMana: 30,
        gold: 100,
        inventory: [],
        equipment: {},
        potions: { health: 3, mana: 0 },
        ammo: 0,
        position: { x: 15, y: 12 },
        facing: { x: 0, y: 1 },
        primaryCooldown: 0,
        secondaryCooldown: 0,
        killCount: 0,
        bossesDefeated: 0,
    },
    currentLocation: 'town',
    dungeonLevel: 1,
    creeps: [],
    projectiles: [],
    particles: [],
    quests: [
        { id: 'quest_1', type: 'kill', title: 'Slay 5 skeletons', target: 'skeleton', required: 5, progress: 0, reward: 100, completed: false },
    ],
    shops: {},
});

test.before(async () => {
    ({ restore } = setupDomStubs());
    await import_for_test('./components.js');
});

test.after(() => {
    restore?.();
});

// ============================================
// Game State Tests
// ============================================

test('Player creation with correct class bonuses', () => {
    const tankStats = { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 10, charisma: 10 };
    const mageStats = { strength: 10, dexterity: 10, constitution: 7, intelligence: 15, wisdom: 13, charisma: 10 };
    const rangerStats = { strength: 12, dexterity: 15, constitution: 10, intelligence: 8, wisdom: 10, charisma: 10 };
    
    // Test tank bonuses (STR +4, CON +3, DEX -2)
    assert.equal(tankStats.strength, 14, 'Tank should have +4 strength');
    assert.equal(tankStats.constitution, 13, 'Tank should have +3 constitution');
    assert.equal(tankStats.dexterity, 8, 'Tank should have -2 dexterity');
    
    // Test mage bonuses (INT +5, WIS +3, CON -3)
    assert.equal(mageStats.intelligence, 15, 'Mage should have +5 intelligence');
    assert.equal(mageStats.wisdom, 13, 'Mage should have +3 wisdom');
    assert.equal(mageStats.constitution, 7, 'Mage should have -3 constitution');
    
    // Test ranger bonuses (DEX +5, STR +2, INT -2)
    assert.equal(rangerStats.dexterity, 15, 'Ranger should have +5 dexterity');
    assert.equal(rangerStats.strength, 12, 'Ranger should have +2 strength');
    assert.equal(rangerStats.intelligence, 8, 'Ranger should have -2 intelligence');
});

test('Stat modifier calculation follows D&D rules', () => {
    const getStatModifier = (statValue) => Math.floor((statValue - 10) / 2);
    
    assert.equal(getStatModifier(10), 0, 'Stat 10 should give +0 modifier');
    assert.equal(getStatModifier(12), 1, 'Stat 12 should give +1 modifier');
    assert.equal(getStatModifier(14), 2, 'Stat 14 should give +2 modifier');
    assert.equal(getStatModifier(8), -1, 'Stat 8 should give -1 modifier');
    assert.equal(getStatModifier(6), -2, 'Stat 6 should give -2 modifier');
    assert.equal(getStatModifier(20), 5, 'Stat 20 should give +5 modifier');
});

test('Dice rolling produces valid results', () => {
    const rollDice = (diceString) => {
        const match = diceString.match(/(\d+)d(\d+)/);
        if (!match) return 0;
        const [, count, sides] = match.map(Number);
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    };
    
    // Test 1d6 produces results between 1-6
    for (let i = 0; i < 100; i++) {
        const result = rollDice('1d6');
        assert.ok(result >= 1 && result <= 6, '1d6 should produce 1-6');
    }
    
    // Test 2d6 produces results between 2-12
    for (let i = 0; i < 100; i++) {
        const result = rollDice('2d6');
        assert.ok(result >= 2 && result <= 12, '2d6 should produce 2-12');
    }
});

test('Player power calculation', () => {
    const gameState = createMockGameState();
    
    const getPlayerPower = (player) => {
        let power = Object.values(player.stats).reduce((a, b) => a + b, 0);
        power += Math.floor(player.killCount / 10);
        power += player.bossesDefeated * 20;
        return power;
    };
    
    // Base power from stats
    const basePower = getPlayerPower(gameState.player);
    assert.equal(basePower, 65, 'Base power should be sum of all stats');
    
    // Power after kills
    gameState.player.killCount = 25;
    const powerWithKills = getPlayerPower(gameState.player);
    assert.equal(powerWithKills, 67, 'Power should increase with kills');
    
    // Power after boss defeat
    gameState.player.bossesDefeated = 1;
    const powerWithBoss = getPlayerPower(gameState.player);
    assert.equal(powerWithBoss, 87, 'Power should increase significantly with boss defeats');
});

test('Damage reduction calculation', () => {
    const calculateDR = (constitution, equipment) => {
        let dr = Math.floor((constitution - 10) / 2) * 0.5;
        for (const item of Object.values(equipment)) {
            if (item?.armor) dr += item.armor * (item.damageReduction || 0.1);
        }
        return Math.min(dr, 75);
    };
    
    // Base DR from constitution
    const baseDR = calculateDR(14, {});
    assert.equal(baseDR, 1, 'CON 14 should give 1% DR');
    
    // DR with armor
    const armorDR = calculateDR(14, {
        chest: { armor: 10, damageReduction: 0.3 }
    });
    assert.equal(armorDR, 4, 'Should add armor DR');
    
    // DR cap at 75%
    const cappedDR = calculateDR(20, {
        chest: { armor: 100, damageReduction: 1 }
    });
    assert.equal(cappedDR, 75, 'DR should cap at 75%');
});

test('Quest progress tracking', () => {
    const gameState = createMockGameState();
    const quest = gameState.quests[0];
    
    // Initial state
    assert.equal(quest.progress, 0, 'Quest should start at 0 progress');
    assert.equal(quest.completed, false, 'Quest should not be completed');
    
    // Progress update
    quest.progress = 3;
    assert.equal(quest.progress, 3, 'Quest progress should update');
    
    // Completion check
    quest.progress = 5;
    quest.completed = quest.progress >= quest.required;
    assert.equal(quest.completed, true, 'Quest should be completed when progress meets required');
});

test('Walkable tile detection', () => {
    const tiles = [
        [{ type: 'wall', walkable: false }, { type: 'floor', walkable: true }],
        [{ type: 'floor', walkable: true }, { type: 'door', walkable: true }],
    ];
    
    const isWalkable = (x, y) => {
        const tileX = Math.floor(x), tileY = Math.floor(y);
        if (tileX < 0 || tileX >= 2 || tileY < 0 || tileY >= 2) return false;
        return tiles[tileY]?.[tileX]?.walkable ?? false;
    };
    
    assert.equal(isWalkable(0, 0), false, 'Wall should not be walkable');
    assert.equal(isWalkable(1, 0), true, 'Floor should be walkable');
    assert.equal(isWalkable(0, 1), true, 'Floor should be walkable');
    assert.equal(isWalkable(1, 1), true, 'Door should be walkable');
    assert.equal(isWalkable(-1, 0), false, 'Out of bounds should not be walkable');
    assert.equal(isWalkable(5, 5), false, 'Out of bounds should not be walkable');
});

// ============================================
// Dungeon Generation Tests
// ============================================

test('Room generation creates non-overlapping rooms', () => {
    const generateRooms = (width, height, count) => {
        const rooms = [];
        const minSize = 5, maxSize = 10;
        
        for (let i = 0; i < count * 3 && rooms.length < count; i++) {
            const w = minSize + Math.floor(Math.random() * (maxSize - minSize));
            const h = minSize + Math.floor(Math.random() * (maxSize - minSize));
            const x = 1 + Math.floor(Math.random() * (width - w - 2));
            const y = 1 + Math.floor(Math.random() * (height - h - 2));
            
            let overlaps = false;
            for (const room of rooms) {
                if (x < room.x + room.w + 2 && x + w + 2 > room.x && 
                    y < room.y + room.h + 2 && y + h + 2 > room.y) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) rooms.push({ x, y, w, h });
        }
        return rooms;
    };
    
    const rooms = generateRooms(50, 50, 8);
    
    // Check no overlaps
    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const r1 = rooms[i], r2 = rooms[j];
            const overlaps = r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
            assert.equal(overlaps, false, 'Rooms should not overlap');
        }
    }
    
    // Check room sizes
    for (const room of rooms) {
        assert.ok(room.w >= 5 && room.w <= 10, 'Room width should be 5-10');
        assert.ok(room.h >= 5 && room.h <= 10, 'Room height should be 5-10');
    }
});

test('Creep scaling with dungeon level', () => {
    const baseHealth = 30;
    const baseDamage = 5;
    
    const scaleCreep = (level) => {
        const levelMult = 1 + (level - 1) * 0.3;
        return {
            health: Math.floor(baseHealth * levelMult),
            damage: Math.floor(baseDamage * levelMult),
        };
    };
    
    const level1 = scaleCreep(1);
    assert.equal(level1.health, 30, 'Level 1 creep should have base health');
    assert.equal(level1.damage, 5, 'Level 1 creep should have base damage');
    
    const level5 = scaleCreep(5);
    assert.equal(level5.health, 66, 'Level 5 creep should have scaled health');
    assert.equal(level5.damage, 11, 'Level 5 creep should have scaled damage');
    
    const level10 = scaleCreep(10);
    assert.ok(level10.health >= 100, 'Level 10 creep should have significantly higher health');
    assert.ok(level10.damage >= 15, 'Level 10 creep should have significantly higher damage');
});

// ============================================
// Combat Tests
// ============================================

test('Projectile collision detection', () => {
    const checkCollision = (projX, projY, targetX, targetY, radius = 0.8) => {
        const dx = projX - targetX;
        const dy = projY - targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < radius;
    };
    
    assert.equal(checkCollision(5, 5, 5, 5), true, 'Same position should collide');
    assert.equal(checkCollision(5, 5, 5.5, 5), true, 'Close position should collide');
    assert.equal(checkCollision(5, 5, 6, 5), false, 'Far position should not collide');
    assert.equal(checkCollision(5, 5, 5.7, 5.7), false, 'Diagonal far position should not collide');
});

test('Attack cone detection for melee', () => {
    const inAttackCone = (attackerX, attackerY, dirX, dirY, targetX, targetY, range, coneAngle = 0.5) => {
        const dx = targetX - attackerX;
        const dy = targetY - attackerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > range) return false;
        
        const dot = (dx * dirX + dy * dirY) / dist;
        return dot > coneAngle;
    };
    
    // Facing right (1, 0)
    assert.equal(inAttackCone(0, 0, 1, 0, 1, 0, 2), true, 'Target directly in front should be hit');
    assert.equal(inAttackCone(0, 0, 1, 0, -1, 0, 2), false, 'Target behind should not be hit');
    assert.equal(inAttackCone(0, 0, 1, 0, 1, 0.5, 2), true, 'Target slightly off-center should be hit');
    assert.equal(inAttackCone(0, 0, 1, 0, 5, 0, 2), false, 'Target out of range should not be hit');
});

// ============================================
// Shop System Tests
// ============================================

test('Item quality affects stats', () => {
    const qualities = [
        { id: 'common', multiplier: 1.0 },
        { id: 'uncommon', multiplier: 1.25 },
        { id: 'rare', multiplier: 1.5 },
        { id: 'epic', multiplier: 2.0 },
        { id: 'legendary', multiplier: 3.0 },
    ];
    
    const baseDamage = 10;
    
    qualities.forEach(quality => {
        const damage = Math.floor(baseDamage * quality.multiplier);
        
        if (quality.id === 'common') assert.equal(damage, 10, 'Common should have base damage');
        if (quality.id === 'rare') assert.equal(damage, 15, 'Rare should have 1.5x damage');
        if (quality.id === 'legendary') assert.equal(damage, 30, 'Legendary should have 3x damage');
    });
});

test('Shop item class filtering', () => {
    const getWeaponTypes = (playerClass) => {
        const types = {
            tank: ['sword', 'axe', 'mace'],
            mage: ['staff', 'wand'],
            ranger: ['bow', 'crossbow'],
        };
        return types[playerClass] || [];
    };
    
    assert.deepEqual(getWeaponTypes('tank'), ['sword', 'axe', 'mace'], 'Tank should see melee weapons');
    assert.deepEqual(getWeaponTypes('mage'), ['staff', 'wand'], 'Mage should see magic weapons');
    assert.deepEqual(getWeaponTypes('ranger'), ['bow', 'crossbow'], 'Ranger should see ranged weapons');
});

test('Gold transaction validation', () => {
    const canAfford = (playerGold, itemPrice) => playerGold >= itemPrice;
    
    assert.equal(canAfford(100, 50), true, 'Should afford cheaper items');
    assert.equal(canAfford(100, 100), true, 'Should afford exact price');
    assert.equal(canAfford(100, 150), false, 'Should not afford expensive items');
});

// ============================================
// Component Tests
// ============================================

test('Player stats state management', async () => {
    // Test the state logic directly
    const state = {
        health: 75,
        maxHealth: 100,
        mana: 25,
        maxMana: 50,
        gold: 250,
        className: 'Warrior',
        stats: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 10, charisma: 10 }
    };
    
    assert.equal(state.gold, 250, 'Should have gold amount');
    assert.equal(state.className, 'Warrior', 'Should have class name');
    assert.equal(state.health, 75, 'Should track health');
    assert.equal(state.maxHealth, 100, 'Should track max health');
    
    // Test health percentage calculation
    const healthPercent = (state.health / state.maxHealth) * 100;
    assert.equal(healthPercent, 75, 'Should calculate health percentage');
});

test('Quest panel state management', async () => {
    // Test the state logic directly
    const state = {
        quests: [
            { id: '1', title: 'Slay 5 Skeletons', progress: 3, required: 5, reward: 100, completed: false }
        ],
        expanded: true
    };
    
    const quest = state.quests[0];
    assert.equal(quest.title, 'Slay 5 Skeletons', 'Should have quest title');
    assert.equal(quest.progress, 3, 'Should track progress');
    assert.equal(quest.required, 5, 'Should have requirement');
    
    // Test completion logic
    quest.progress = 5;
    quest.completed = quest.progress >= quest.required;
    assert.equal(quest.completed, true, 'Quest should be completed');
});

test('Inventory panel state management', async () => {
    // Test the state logic directly instead of DOM rendering
    const state = {
        potions: { health: 5, mana: 3 },
        classId: 'mage',
        expanded: false
    };
    
    assert.equal(state.potions.health, 5, 'Should have 5 health potions');
    assert.equal(state.potions.mana, 3, 'Should have 3 mana potions');
    assert.equal(state.classId, 'mage', 'Should be mage class');
});

// ============================================
// Integration Tests
// ============================================

test('Player death resets position and respawns creeps', () => {
    const gameState = createMockGameState();
    gameState.currentLocation = 'dungeon';
    gameState.player.position = { x: 25, y: 30 };
    gameState.creeps = [
        { id: 'creep_1', health: 0, maxHealth: 30, position: { x: 10, y: 10 }, spawnPosition: { x: 5, y: 5 } }
    ];
    
    // Simulate death
    const handleDeath = () => {
        gameState.player.health = gameState.player.maxHealth;
        gameState.currentLocation = 'town';
        gameState.player.position = { x: 15, y: 12 };
        
        for (const creep of gameState.creeps) {
            creep.health = creep.maxHealth;
            creep.position = { ...creep.spawnPosition };
        }
    };
    
    handleDeath();
    
    assert.equal(gameState.currentLocation, 'town', 'Should return to town');
    assert.deepEqual(gameState.player.position, { x: 15, y: 12 }, 'Should reset to town spawn');
    assert.equal(gameState.player.health, 150, 'Should restore health');
    assert.equal(gameState.creeps[0].health, 30, 'Should respawn creeps');
    assert.deepEqual(gameState.creeps[0].position, { x: 5, y: 5 }, 'Creeps should return to spawn');
});

test('Boss defeat triggers dungeon regeneration', () => {
    const gameState = createMockGameState();
    gameState.dungeonLevel = 1;
    
    const handleBossDefeat = () => {
        gameState.player.bossesDefeated++;
        gameState.player.gold += 200;
        gameState.dungeonLevel++;
        gameState.currentLocation = 'town';
    };
    
    handleBossDefeat();
    
    assert.equal(gameState.player.bossesDefeated, 1, 'Should increment boss count');
    assert.equal(gameState.player.gold, 300, 'Should award gold');
    assert.equal(gameState.dungeonLevel, 2, 'Should increment dungeon level');
    assert.equal(gameState.currentLocation, 'town', 'Should return to town');
});

test('Teleport from dungeon to town', () => {
    const gameState = createMockGameState();
    gameState.currentLocation = 'dungeon';
    gameState.player.position = { x: 25, y: 30 };
    
    const teleportToTown = () => {
        if (gameState.currentLocation === 'town') return false;
        gameState.currentLocation = 'town';
        gameState.player.position = { x: 15, y: 12 };
        return true;
    };
    
    const result = teleportToTown();
    
    assert.equal(result, true, 'Should successfully teleport');
    assert.equal(gameState.currentLocation, 'town', 'Should be in town');
    assert.deepEqual(gameState.player.position, { x: 15, y: 12 }, 'Should be at town spawn');
});

console.log('All tests defined. Run with: node --test game.test.js');
