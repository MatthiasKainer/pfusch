// Main Game Entry Point - Depths of Crimson
import { GameRenderer } from './renderer.js';
import './components.js';

// Sound Effects Manager using Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        this.musicVolume = 0.15;
        this.initialized = false;
        this.currentTrack = null;
        this.musicNodes = [];
        this.musicPlaying = false;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.ctx.destination);
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }
    
    // Procedural music generator
    startMusic(location) {
        if (!this.enabled || !this.ctx) return;
        
        // Stop existing music
        this.stopMusic();
        
        this.musicPlaying = true;
        this.currentTrack = location;
        
        if (location === 'town') {
            this.playTownMusic();
        } else {
            this.playDungeonMusic();
        }
    }
    
    stopMusic() {
        this.musicPlaying = false;
        this.musicNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {}
        });
        this.musicNodes = [];
    }
    
    playTownMusic() {
        // Peaceful medieval-style music
        // Using pentatonic scale for pleasant feel: C, D, E, G, A
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
        const tempo = 0.5; // seconds per beat
        
        const playMelody = () => {
            if (!this.musicPlaying || this.currentTrack !== 'town') return;
            
            // Simple melodic pattern
            const pattern = [0, 2, 4, 5, 4, 2, 3, 1];
            let time = this.ctx.currentTime;
            
            pattern.forEach((noteIndex, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = scale[noteIndex];
                
                gain.gain.setValueAtTime(0, time + i * tempo);
                gain.gain.linearRampToValueAtTime(this.musicVolume * 0.6, time + i * tempo + 0.05);
                gain.gain.linearRampToValueAtTime(this.musicVolume * 0.4, time + i * tempo + tempo * 0.8);
                gain.gain.linearRampToValueAtTime(0, time + i * tempo + tempo);
                
                osc.connect(gain);
                gain.connect(this.musicGain);
                
                osc.start(time + i * tempo);
                osc.stop(time + i * tempo + tempo);
                this.musicNodes.push(osc);
            });
            
            // Add bass notes
            [0, 4].forEach((beat, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = scale[i * 2] / 2; // Octave lower
                
                gain.gain.setValueAtTime(0, time + beat * tempo);
                gain.gain.linearRampToValueAtTime(this.musicVolume * 0.4, time + beat * tempo + 0.1);
                gain.gain.linearRampToValueAtTime(0, time + beat * tempo + tempo * 3.5);
                
                osc.connect(gain);
                gain.connect(this.musicGain);
                
                osc.start(time + beat * tempo);
                osc.stop(time + beat * tempo + tempo * 4);
                this.musicNodes.push(osc);
            });
            
            // Schedule next phrase
            setTimeout(() => playMelody(), pattern.length * tempo * 1000);
        };
        
        playMelody();
    }
    
    playDungeonMusic() {
        // Dark, ominous music
        // Using minor scale with tritones: A, B, C, D, Eb, F, G
        const scale = [220.00, 246.94, 261.63, 293.66, 311.13, 349.23, 392.00];
        const tempo = 0.7;
        
        const playAmbience = () => {
            if (!this.musicPlaying || this.currentTrack !== 'dungeon') return;
            
            const time = this.ctx.currentTime;
            
            // Deep drone
            const drone = this.ctx.createOscillator();
            const droneGain = this.ctx.createGain();
            const droneFilter = this.ctx.createBiquadFilter();
            
            drone.type = 'sawtooth';
            drone.frequency.value = 55; // Low A
            
            droneFilter.type = 'lowpass';
            droneFilter.frequency.value = 200;
            
            droneGain.gain.setValueAtTime(this.musicVolume * 0.3, time);
            droneGain.gain.linearRampToValueAtTime(this.musicVolume * 0.5, time + 2);
            droneGain.gain.linearRampToValueAtTime(this.musicVolume * 0.3, time + 4);
            droneGain.gain.linearRampToValueAtTime(0, time + 5.5);
            
            drone.connect(droneFilter);
            droneFilter.connect(droneGain);
            droneGain.connect(this.musicGain);
            
            drone.start(time);
            drone.stop(time + 6);
            this.musicNodes.push(drone);
            
            // Eerie high notes
            const melodyPattern = [6, 4, 5, 3, 4, 2, 3, 0];
            melodyPattern.forEach((noteIndex, i) => {
                if (Math.random() > 0.6) return; // Sparse melody
                
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = scale[noteIndex] * 2;
                
                const startTime = time + i * tempo + Math.random() * 0.2;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(this.musicVolume * 0.2, startTime + 0.1);
                gain.gain.linearRampToValueAtTime(0, startTime + tempo * 1.5);
                
                osc.connect(gain);
                gain.connect(this.musicGain);
                
                osc.start(startTime);
                osc.stop(startTime + tempo * 2);
                this.musicNodes.push(osc);
            });
            
            // Occasional tritone tension
            if (Math.random() > 0.5) {
                const tension = this.ctx.createOscillator();
                const tensionGain = this.ctx.createGain();
                
                tension.type = 'triangle';
                tension.frequency.value = 311.13; // Eb - tritone from A
                
                tensionGain.gain.setValueAtTime(0, time + 2);
                tensionGain.gain.linearRampToValueAtTime(this.musicVolume * 0.15, time + 2.5);
                tensionGain.gain.linearRampToValueAtTime(0, time + 4);
                
                tension.connect(tensionGain);
                tensionGain.connect(this.musicGain);
                
                tension.start(time + 2);
                tension.stop(time + 4.5);
                this.musicNodes.push(tension);
            }
            
            // Schedule next phrase
            setTimeout(() => playAmbience(), 5500);
        };
        
        playAmbience();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.musicGain) {
            this.musicGain.gain.value = volume;
        }
    }
    
    // Generate sounds procedurally
    play(soundType) {
        if (!this.enabled || !this.ctx) return;
        
        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        switch (soundType) {
            case 'sword_swing':
                this.playSwordSwing();
                break;
            case 'fireball':
                this.playFireball();
                break;
            case 'arrow':
                this.playArrow();
                break;
            case 'hit':
                this.playHit();
                break;
            case 'enemy_hit':
                this.playEnemyHit();
                break;
            case 'enemy_death':
                this.playEnemyDeath();
                break;
            case 'player_hurt':
                this.playPlayerHurt();
                break;
            case 'heal':
                this.playHeal();
                break;
            case 'mana':
                this.playMana();
                break;
            case 'buy':
                this.playBuy();
                break;
            case 'teleport':
                this.playTeleport();
                break;
            case 'boss_death':
                this.playBossDeath();
                break;
            case 'level_up':
                this.playLevelUp();
                break;
            case 'quest_complete':
                this.playQuestComplete();
                break;
        }
    }
    
    createOscillator(type, frequency, duration, volume = this.volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    
    createNoise(duration, volume = this.volume) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }
    
    playSwordSwing() {
        // Whoosh sound
        this.createNoise(0.15, 0.2);
        this.createOscillator('sine', 200, 0.1, 0.1);
        setTimeout(() => this.createOscillator('sine', 150, 0.05, 0.05), 50);
    }
    
    playFireball() {
        // Fiery whoosh
        this.createNoise(0.2, 0.15);
        this.createOscillator('sawtooth', 100, 0.3, 0.1);
        this.createOscillator('sine', 300, 0.2, 0.15);
    }
    
    playArrow() {
        // Quick twang and whoosh
        this.createOscillator('triangle', 800, 0.05, 0.2);
        this.createOscillator('triangle', 600, 0.05, 0.15);
        this.createNoise(0.1, 0.1);
    }
    
    playHit() {
        // Impact sound
        this.createOscillator('square', 80, 0.1, 0.2);
        this.createNoise(0.05, 0.3);
    }
    
    playEnemyHit() {
        // Meaty hit
        this.createOscillator('sine', 100, 0.1, 0.25);
        this.createOscillator('square', 60, 0.08, 0.15);
        this.createNoise(0.05, 0.2);
    }
    
    playEnemyDeath() {
        // Death groan
        this.createOscillator('sawtooth', 150, 0.3, 0.15);
        this.createOscillator('sine', 100, 0.4, 0.1);
        setTimeout(() => this.createOscillator('sine', 60, 0.3, 0.1), 100);
    }
    
    playPlayerHurt() {
        // Pain sound
        this.createOscillator('sawtooth', 200, 0.15, 0.2);
        this.createOscillator('square', 100, 0.1, 0.15);
    }
    
    playHeal() {
        // Magical healing chime
        this.createOscillator('sine', 523, 0.15, 0.15); // C5
        setTimeout(() => this.createOscillator('sine', 659, 0.15, 0.15), 100); // E5
        setTimeout(() => this.createOscillator('sine', 784, 0.2, 0.15), 200); // G5
    }
    
    playMana() {
        // Mystical sound
        this.createOscillator('sine', 392, 0.15, 0.12); // G4
        setTimeout(() => this.createOscillator('sine', 494, 0.15, 0.12), 80); // B4
        setTimeout(() => this.createOscillator('sine', 587, 0.2, 0.12), 160); // D5
    }
    
    playBuy() {
        // Coin sound
        this.createOscillator('sine', 1200, 0.08, 0.15);
        setTimeout(() => this.createOscillator('sine', 1500, 0.1, 0.12), 60);
    }
    
    playTeleport() {
        // Magical whoosh
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createOscillator('sine', 300 + i * 100, 0.15, 0.1);
            }, i * 50);
        }
        this.createNoise(0.3, 0.1);
    }
    
    playBossDeath() {
        // Epic death
        this.createOscillator('sawtooth', 80, 0.5, 0.2);
        this.createOscillator('square', 60, 0.6, 0.15);
        setTimeout(() => {
            this.createOscillator('sine', 200, 0.3, 0.15);
            this.createOscillator('sine', 250, 0.3, 0.12);
        }, 200);
        this.createNoise(0.4, 0.15);
    }
    
    playLevelUp() {
        // Triumphant fanfare
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.createOscillator('sine', freq, 0.2, 0.15), i * 100);
        });
    }
    
    playQuestComplete() {
        // Achievement sound
        this.createOscillator('sine', 659, 0.15, 0.15); // E5
        setTimeout(() => this.createOscillator('sine', 784, 0.15, 0.15), 100); // G5
        setTimeout(() => this.createOscillator('sine', 988, 0.25, 0.18), 200); // B5
    }
}

// Global sound manager
const soundManager = new SoundManager();

class DungeonCrawlerGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(this.canvas);
        this.gameState = {
            player: null,
            dungeon: null,
            town: null,
            currentLocation: 'town',
            dungeonLevel: 1,
            creeps: [],
            projectiles: [],
            particles: [],
            quests: [],
            shops: {},
        };
        this.initialized = false;
        this.keysPressed = new Set();
        this.mousePosition = { x: 0, y: 0 };
        this.lastTime = performance.now();
        
        // Attack animation state
        this.attackAnimation = {
            active: false,
            type: null, // 'melee', 'ranged', 'magic'
            startTime: 0,
            duration: 300,
            angle: 0,
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Character selection
        window.addEventListener('character-select.start', (e) => {
            this.initGame(e.detail.classId, e.detail.gender);
        });
        
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.keysPressed.add(e.key.toLowerCase());
            this.handleKeyPress(e.key.toLowerCase());
        });
        
        document.addEventListener('keyup', (e) => {
            this.keysPressed.delete(e.key.toLowerCase());
        });
        
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!this.initialized) return;
            
            // Initialize sound on first interaction
            soundManager.init();
            
            const worldPos = this.renderer.screenToWorld(e.clientX, e.clientY);
            
            if (e.button === 0) {
                this.playerAttack(true, worldPos.x, worldPos.y);
            } else if (e.button === 2) {
                this.playerAttack(false, worldPos.x, worldPos.y);
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Message handling for UI interactions
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'buy-item') {
                this.buyItem(e.data.shopId, e.data.itemIndex);
            } else if (e.data?.type === 'equip-item') {
                this.equipItem(e.data.index);
            } else if (e.data?.type === 'claim-quest') {
                this.claimQuestReward(e.data.questId);
            }
        });
    }
    
    handleKeyPress(key) {
        if (!this.initialized) return;
        
        switch (key) {
            case '1':
                this.usePotion('health');
                break;
            case '2':
                if (this.gameState.player?.classId === 'mage') {
                    this.usePotion('mana');
                }
                break;
            case 't':
                this.teleportToTown();
                break;
        }
    }
    
    initGame(classId, gender) {
        // Initialize player
        this.gameState.player = this.createPlayer(classId, gender);
        
        // Generate town
        this.gameState.town = this.generateTown();
        
        // Generate initial dungeon
        this.gameState.dungeon = this.generateDungeon(1);
        
        // Generate quests
        this.generateQuests();
        
        // Refresh shops
        this.refreshShops();
        
        this.initialized = true;
        
        // Notify UI
        window.dispatchEvent(new CustomEvent('game-initialized'));
        this.broadcastState();
        
        // Start music
        soundManager.startMusic('town');
        
        // Start game loop
        this.gameLoop();
        
        this.showToast('Welcome to Depths of Crimson!', 'info');
    }
    
    createPlayer(classId, gender) {
        const classes = {
            tank: {
                id: 'tank', name: 'Warrior', baseHealth: 150, baseMana: 30,
                primaryAttack: { name: 'Slash', damage: 15, range: 1.5, cooldown: 800, manaCost: 0 },
                secondaryAttack: { name: 'Shield Bash', damage: 10, range: 1.2, cooldown: 2000, manaCost: 10, stun: 1000 },
                statBonuses: { strength: 4, constitution: 3, dexterity: -2 },
            },
            mage: {
                id: 'mage', name: 'Mage', baseHealth: 80, baseMana: 150,
                primaryAttack: { name: 'Fireball', damage: 25, range: 8, cooldown: 1000, manaCost: 15, projectile: true, aoe: 1.5 },
                secondaryAttack: { name: 'Frost Nova', damage: 18, range: 3, cooldown: 3000, manaCost: 30, slow: 50, slowDuration: 3000 },
                statBonuses: { intelligence: 5, wisdom: 3, constitution: -3 },
            },
            ranger: {
                id: 'ranger', name: 'Ranger', baseHealth: 100, baseMana: 60,
                primaryAttack: { name: 'Arrow Shot', damage: 20, range: 10, cooldown: 600, manaCost: 0, projectile: true, requiresAmmo: true },
                secondaryAttack: { name: 'Multi-Shot', damage: 12, range: 8, cooldown: 2500, manaCost: 20, projectile: true, projectileCount: 3, requiresAmmo: true, ammoCount: 3 },
                statBonuses: { dexterity: 5, strength: 2, intelligence: -2 },
            },
        };
        
        const classData = classes[classId];
        const stats = {
            strength: 10, dexterity: 10, constitution: 10,
            intelligence: 10, wisdom: 10, charisma: 10,
        };
        
        for (const [stat, bonus] of Object.entries(classData.statBonuses)) {
            stats[stat] = Math.max(1, stats[stat] + bonus);
        }
        
        const maxHealth = classData.baseHealth + Math.floor((stats.constitution - 10) / 2) * 10;
        const maxMana = classData.baseMana + Math.floor((stats.intelligence - 10) / 2) * 5;
        
        return {
            class: classData,
            classId,
            gender,
            stats,
            health: maxHealth,
            maxHealth,
            mana: maxMana,
            maxMana,
            gold: 100,
            inventory: [],
            equipment: { mainhand: null, offhand: null, head: null, chest: null, legs: null, feet: null, hands: null },
            potions: { health: 3, mana: classId === 'mage' ? 3 : 0 },
            ammo: classId === 'ranger' ? 50 : 0,
            position: { x: 15, y: 12 },
            facing: { x: 0, y: 1 },
            primaryCooldown: 0,
            secondaryCooldown: 0,
            stunned: 0,
            slowed: 0,
            killCount: 0,
            bossesDefeated: 0,
        };
    }
    
    generateTown() {
        const width = 30, height = 25;
        const tiles = [];
        
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                tiles[y][x] = { type: 'grass', walkable: true };
            }
        }
        
        // Paths
        for (let x = 0; x < width; x++) tiles[12][x] = { type: 'path', walkable: true };
        for (let y = 5; y < height - 2; y++) tiles[y][15] = { type: 'path', walkable: true };
        
        // Buildings
        const buildings = [
            { id: 'weapon_shop', name: "Grimshaw's Armory", x: 5, y: 8, w: 5, h: 4 },
            { id: 'armor_shop', name: "Ironhide Outfitters", x: 5, y: 15, w: 5, h: 4 },
            { id: 'potion_shop', name: "Mystic Brews", x: 20, y: 8, w: 5, h: 4 },
            { id: 'ammo_shop', name: "Fletcher's Point", x: 20, y: 15, w: 5, h: 4 },
            { id: 'quest_board', name: 'Quest Board', x: 14, y: 5, w: 3, h: 2 },
            { id: 'dungeon_entrance', name: 'Dungeon', x: 14, y: 20, w: 3, h: 3 },
        ];
        
        for (const b of buildings) {
            for (let y = b.y; y < b.y + b.h; y++) {
                for (let x = b.x; x < b.x + b.w; x++) {
                    tiles[y][x] = { type: 'building', walkable: false, buildingId: b.id, buildingName: b.name };
                }
            }
            const doorX = Math.floor(b.x + b.w / 2);
            const doorY = b.y + b.h;
            if (tiles[doorY] && tiles[doorY][doorX]) {
                tiles[doorY][doorX] = { type: 'door', walkable: true, buildingId: b.id, buildingName: b.name };
            }
        }
        
        // Border
        for (let x = 0; x < width; x++) {
            tiles[0][x] = { type: 'fence', walkable: false };
            tiles[height - 1][x] = { type: 'fence', walkable: false };
        }
        for (let y = 0; y < height; y++) {
            tiles[y][0] = { type: 'fence', walkable: false };
            tiles[y][width - 1] = { type: 'fence', walkable: false };
        }
        
        return { width, height, tiles, buildings };
    }
    
    generateDungeon(level) {
        const width = 50, height = 50;
        const tiles = [];
        
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                tiles[y][x] = { type: 'wall', walkable: false };
            }
        }
        
        const rooms = this.generateRooms(width, height, 8 + level);
        
        for (const room of rooms) {
            for (let y = room.y; y < room.y + room.h; y++) {
                for (let x = room.x; x < room.x + room.w; x++) {
                    if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
                        tiles[y][x] = { type: 'floor', walkable: true };
                    }
                }
            }
        }
        
        // Connect rooms
        for (let i = 0; i < rooms.length - 1; i++) {
            const r1 = rooms[i], r2 = rooms[i + 1];
            const x1 = Math.floor(r1.x + r1.w / 2), y1 = Math.floor(r1.y + r1.h / 2);
            const x2 = Math.floor(r2.x + r2.w / 2), y2 = Math.floor(r2.y + r2.h / 2);
            for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                if (tiles[y1]?.[x]) tiles[y1][x] = { type: 'floor', walkable: true };
            }
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                if (tiles[y]?.[x2]) tiles[y][x2] = { type: 'floor', walkable: true };
            }
        }
        
        const entrance = { x: Math.floor(rooms[0].x + rooms[0].w / 2), y: Math.floor(rooms[0].y + rooms[0].h / 2) };
        const bossSpawn = { x: Math.floor(rooms[rooms.length - 1].x + rooms[rooms.length - 1].w / 2), y: Math.floor(rooms[rooms.length - 1].y + rooms[rooms.length - 1].h / 2) };
        
        tiles[entrance.y][entrance.x] = { type: 'stairs_up', walkable: true };
        tiles[bossSpawn.y][bossSpawn.x] = { type: 'boss_spawn', walkable: true };
        
        // Generate creeps
        this.generateCreeps(level, rooms);
        
        return { width, height, tiles, rooms, entrance, bossSpawn, level };
    }
    
    generateRooms(width, height, count) {
        const rooms = [];
        const minSize = 5, maxSize = 10;
        
        for (let i = 0; i < count * 3 && rooms.length < count; i++) {
            const w = minSize + Math.floor(Math.random() * (maxSize - minSize));
            const h = minSize + Math.floor(Math.random() * (maxSize - minSize));
            const x = 1 + Math.floor(Math.random() * (width - w - 2));
            const y = 1 + Math.floor(Math.random() * (height - h - 2));
            
            let overlaps = false;
            for (const room of rooms) {
                if (x < room.x + room.w + 2 && x + w + 2 > room.x && y < room.y + room.h + 2 && y + h + 2 > room.y) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) rooms.push({ x, y, w, h });
        }
        return rooms;
    }
    
    generateCreeps(level, rooms) {
        const creepTypes = [
            { id: 'skeleton', name: 'Skeleton', baseHealth: 30, baseDamage: 5, speed: 2, attackRange: 1.2, attackCooldown: 1500, xpValue: 10, sprite: 'skeleton' },
            { id: 'zombie', name: 'Zombie', baseHealth: 50, baseDamage: 8, speed: 1, attackRange: 1.2, attackCooldown: 2000, xpValue: 15, sprite: 'zombie' },
            { id: 'ghost', name: 'Ghost', baseHealth: 20, baseDamage: 12, speed: 3, attackRange: 1.5, attackCooldown: 1800, xpValue: 20, sprite: 'ghost' },
            { id: 'imp', name: 'Imp', baseHealth: 25, baseDamage: 10, speed: 4, attackRange: 4, attackCooldown: 1200, xpValue: 25, ranged: true, sprite: 'imp' },
            { id: 'orc', name: 'Orc', baseHealth: 60, baseDamage: 12, speed: 2.5, attackRange: 1.5, attackCooldown: 1400, xpValue: 30, sprite: 'orc' },
            { id: 'dark_mage', name: 'Dark Mage', baseHealth: 35, baseDamage: 18, speed: 2, attackRange: 7, attackCooldown: 2500, xpValue: 40, ranged: true, sprite: 'dark_mage' },
        ];
        
        const bossTypes = [
            { id: 'skeleton_king', name: 'Skeleton King', baseHealth: 500, baseDamage: 25, speed: 1.5, attackRange: 2, attackCooldown: 2000, goldReward: 200, sprite: 'skeleton_king' },
            { id: 'demon_lord', name: 'Demon Lord', baseHealth: 800, baseDamage: 35, speed: 2, attackRange: 3, attackCooldown: 1800, goldReward: 400, sprite: 'demon_lord' },
            { id: 'lich', name: 'The Lich', baseHealth: 600, baseDamage: 45, speed: 1, attackRange: 8, attackCooldown: 2500, goldReward: 600, sprite: 'lich' },
            { id: 'dragon', name: 'Ancient Dragon', baseHealth: 1500, baseDamage: 60, speed: 2.5, attackRange: 5, attackCooldown: 3000, goldReward: 1000, sprite: 'dragon' },
        ];
        
        this.gameState.creeps = [];
        const creepsPerRoom = 2 + Math.floor(level / 2);
        const levelMult = 1 + (level - 1) * 0.3;
        
        for (let i = 1; i < rooms.length - 1; i++) {
            const room = rooms[i];
            for (let j = 0; j < creepsPerRoom; j++) {
                const creepType = creepTypes[Math.floor(Math.random() * creepTypes.length)];
                const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                
                this.gameState.creeps.push({
                    id: `creep_${Date.now()}_${Math.random()}`,
                    ...creepType,
                    health: Math.floor(creepType.baseHealth * levelMult),
                    maxHealth: Math.floor(creepType.baseHealth * levelMult),
                    damage: Math.floor(creepType.baseDamage * levelMult),
                    position: { x, y },
                    spawnPosition: { x, y },
                    state: 'idle',
                    attackCooldown: 0,
                    stunned: 0,
                    slowed: 0,
                });
            }
        }
        
        // Boss
        const bossRoom = rooms[rooms.length - 1];
        const bossIndex = Math.min(level - 1, bossTypes.length - 1) % bossTypes.length;
        const bossType = bossTypes[bossIndex];
        const bossLevelMult = 1 + Math.floor(level / bossTypes.length) * 0.5;
        
        this.gameState.creeps.push({
            id: `boss_${Date.now()}`,
            ...bossType,
            isBoss: true,
            health: Math.floor(bossType.baseHealth * bossLevelMult),
            maxHealth: Math.floor(bossType.baseHealth * bossLevelMult),
            damage: Math.floor(bossType.baseDamage * bossLevelMult),
            position: { x: Math.floor(bossRoom.x + bossRoom.w / 2), y: Math.floor(bossRoom.y + bossRoom.h / 2) },
            spawnPosition: { x: Math.floor(bossRoom.x + bossRoom.w / 2), y: Math.floor(bossRoom.y + bossRoom.h / 2) },
            state: 'idle',
            attackCooldown: 0,
            stunned: 0,
            slowed: 0,
        });
    }
    
    generateQuests() {
        const creepTypes = ['skeleton', 'zombie', 'ghost', 'imp', 'orc', 'dark_mage'];
        this.gameState.quests = [];
        
        for (let i = 0; i < 3; i++) {
            if (i < 2) {
                const target = creepTypes[Math.floor(Math.random() * creepTypes.length)];
                const count = 5 + Math.floor(Math.random() * 10);
                this.gameState.quests.push({
                    id: `quest_${Date.now()}_${i}`,
                    type: 'kill',
                    title: `Slay ${count} ${target}s`,
                    target,
                    required: count,
                    progress: 0,
                    reward: count * 20,
                    completed: false,
                });
            } else {
                this.gameState.quests.push({
                    id: `quest_${Date.now()}_${i}`,
                    type: 'boss',
                    title: 'Defeat the Dungeon Boss',
                    target: 'boss',
                    required: 1,
                    progress: 0,
                    reward: 200 * this.gameState.dungeonLevel,
                    completed: false,
                });
            }
        }
    }
    
    refreshShops() {
        const power = this.getPlayerPower();
        const playerClass = this.gameState.player?.classId || 'tank';
        
        const generateItems = (shopType) => {
            const items = [];
            const qualities = [
                { id: 'common', multiplier: 1.0 },
                { id: 'uncommon', multiplier: 1.25 },
                { id: 'rare', multiplier: 1.5 },
                { id: 'epic', multiplier: 2.0 },
                { id: 'legendary', multiplier: 3.0 },
            ];
            
            for (let i = 0; i < 6; i++) {
                const isUpgrade = i === 5;
                const qualityRoll = Math.random();
                const quality = qualityRoll < 0.5 ? qualities[0] : qualityRoll < 0.75 ? qualities[1] : qualityRoll < 0.9 ? qualities[2] : qualityRoll < 0.98 ? qualities[3] : qualities[4];
                const itemLevel = Math.floor(power / 10) + (isUpgrade ? 2 : 0);
                
                let item;
                if (shopType === 'weapon') {
                    const types = playerClass === 'tank' ? ['sword', 'axe', 'mace'] : playerClass === 'mage' ? ['staff', 'wand'] : ['bow', 'crossbow'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    const damage = Math.floor((5 + itemLevel * 3) * quality.multiplier);
                    const prefixes = ['Rusty', 'Iron', 'Steel', 'Mithril', 'Adamantine'];
                    const statBonuses = {};
                    const statKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom'];
                    for (let j = 0; j < Math.floor(quality.multiplier); j++) {
                        const stat = statKeys[Math.floor(Math.random() * statKeys.length)];
                        statBonuses[stat] = (statBonuses[stat] || 0) + Math.floor(1 + itemLevel * 0.5);
                    }
                    item = {
                        id: `weapon_${Date.now()}_${i}`,
                        name: `${prefixes[Math.min(itemLevel, prefixes.length - 1)]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                        category: 'weapon', type,
                        slot: ['bow', 'crossbow', 'staff'].includes(type) ? 'twohand' : 'mainhand',
                        damage, statBonuses, quality,
                        price: Math.floor((15 + itemLevel * 20) * quality.multiplier),
                        requiresPower: isUpgrade ? power + 10 : Math.max(0, power - 5),
                    };
                } else if (shopType === 'armor') {
                    const slots = ['head', 'chest', 'legs', 'feet', 'hands'];
                    const slot = slots[Math.floor(Math.random() * slots.length)];
                    const armor = Math.floor((3 + itemLevel * 2) * quality.multiplier);
                    const prefixes = ['Worn', 'Sturdy', 'Reinforced', 'Enchanted', 'Legendary'];
                    const slotNames = { head: 'Helm', chest: 'Chestplate', legs: 'Greaves', feet: 'Boots', hands: 'Gauntlets' };
                    const statBonuses = {};
                    const statKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom'];
                    for (let j = 0; j < Math.floor(quality.multiplier); j++) {
                        const stat = statKeys[Math.floor(Math.random() * statKeys.length)];
                        statBonuses[stat] = (statBonuses[stat] || 0) + Math.floor(1 + itemLevel * 0.3);
                    }
                    item = {
                        id: `armor_${Date.now()}_${i}`,
                        name: `${prefixes[Math.min(itemLevel, prefixes.length - 1)]} ${slotNames[slot]}`,
                        category: 'armor', slot, armor,
                        damageReduction: playerClass === 'tank' ? 0.3 : playerClass === 'ranger' ? 0.15 : 0.05,
                        statBonuses, quality,
                        price: Math.floor((12 + itemLevel * 15) * quality.multiplier),
                        requiresPower: isUpgrade ? power + 10 : Math.max(0, power - 5),
                    };
                } else if (shopType === 'potion') {
                    const potionTypes = [
                        { name: 'Health Potion', type: 'health', effect: 50 + itemLevel * 15 },
                        { name: 'Mana Potion', type: 'mana', effect: 40 + itemLevel * 12 },
                    ];
                    const pt = potionTypes[Math.floor(Math.random() * potionTypes.length)];
                    item = {
                        id: `potion_${Date.now()}_${i}`,
                        name: pt.name, category: 'consumable', type: pt.type, effect: pt.effect,
                        quality: qualities[0],
                        price: Math.floor(8 + pt.effect * 0.3),
                        quantity: 1,
                        requiresPower: 0,
                    };
                } else {
                    const ammoTypes = [
                        { name: 'Wooden Arrows', damage: 0, quantity: 25 },
                        { name: 'Iron Arrows', damage: 3, quantity: 20 },
                        { name: 'Steel Arrows', damage: 6, quantity: 15 },
                    ];
                    const at = ammoTypes[Math.min(Math.floor(itemLevel / 2), ammoTypes.length - 1)];
                    item = {
                        id: `ammo_${Date.now()}_${i}`,
                        name: at.name, category: 'ammo', damage: at.damage, quantity: at.quantity,
                        quality: qualities[0],
                        price: Math.floor(5 + at.damage * at.quantity * 0.2),
                        requiresPower: 0,
                    };
                }
                items.push(item);
            }
            return items;
        };
        
        this.gameState.shops = {
            weapon_shop: generateItems('weapon'),
            armor_shop: generateItems('armor'),
            potion_shop: generateItems('potion'),
            ammo_shop: generateItems('ammo'),
        };
    }
    
    getPlayerPower() {
        const player = this.gameState.player;
        if (!player) return 60;
        
        let power = Object.values(player.stats).reduce((a, b) => a + b, 0);
        power += Math.floor(player.killCount / 10);
        power += player.bossesDefeated * 20;
        
        for (const item of Object.values(player.equipment)) {
            if (item) {
                power += (item.damage || 0) + (item.armor || 0);
            }
        }
        
        return power;
    }
    
    getEffectiveStats() {
        const player = this.gameState.player;
        if (!player) return {};
        
        const stats = { ...player.stats };
        for (const item of Object.values(player.equipment)) {
            if (item?.statBonuses) {
                for (const [stat, bonus] of Object.entries(item.statBonuses)) {
                    stats[stat] = (stats[stat] || 10) + bonus;
                }
            }
        }
        return stats;
    }
    
    isWalkable(x, y) {
        const location = this.gameState.currentLocation === 'town' ? this.gameState.town : this.gameState.dungeon;
        if (!location) return false;
        
        const tileX = Math.floor(x), tileY = Math.floor(y);
        if (tileX < 0 || tileX >= location.width || tileY < 0 || tileY >= location.height) return false;
        return location.tiles[tileY]?.[tileX]?.walkable ?? false;
    }
    
    gameLoop() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;
        
        if (this.initialized) {
            this.update(deltaTime);
            
            // Update attack animation
            if (this.attackAnimation.active) {
                const elapsed = now - this.attackAnimation.startTime;
                if (elapsed >= this.attackAnimation.duration) {
                    this.attackAnimation.active = false;
                }
            }
            
            this.renderer.render(this.gameState, deltaTime, this.attackAnimation);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        const player = this.gameState.player;
        if (!player) return;
        
        // Update cooldowns
        player.primaryCooldown = Math.max(0, player.primaryCooldown - deltaTime);
        player.secondaryCooldown = Math.max(0, player.secondaryCooldown - deltaTime);
        player.stunned = Math.max(0, player.stunned - deltaTime);
        player.slowed = Math.max(0, player.slowed - deltaTime);
        
        // Mana regen
        const stats = this.getEffectiveStats();
        const manaRegen = 1 + Math.floor((stats.wisdom - 10) / 2) * 0.5;
        player.mana = Math.min(player.maxMana, player.mana + manaRegen * deltaTime / 1000);
        
        // Health regen in town
        if (this.gameState.currentLocation === 'town') {
            const healthRegen = 5 + Math.floor((stats.constitution - 10) / 2);
            player.health = Math.min(player.maxHealth, player.health + healthRegen * deltaTime / 1000);
        }
        
        // Handle movement
        if (player.stunned <= 0) {
            let dx = 0, dy = 0;
            if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) dy -= 1;
            if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) dy += 1;
            if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) dx -= 1;
            if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) dx += 1;
            
            if (dx !== 0 || dy !== 0) {
                const mag = Math.sqrt(dx * dx + dy * dy);
                dx /= mag;
                dy /= mag;
                
                let speed = 4;
                if (player.slowed > 0) speed *= 0.5;
                
                const newX = player.position.x + dx * speed * deltaTime / 1000;
                const newY = player.position.y + dy * speed * deltaTime / 1000;
                
                if (this.isWalkable(newX, player.position.y)) player.position.x = newX;
                if (this.isWalkable(player.position.x, newY)) player.position.y = newY;
                
                player.facing = { x: dx, y: dy };
                
                // Check for door interaction
                this.checkDoorInteraction();
            }
        }
        
        // Update creeps
        if (this.gameState.currentLocation === 'dungeon') {
            this.updateCreeps(deltaTime);
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Broadcast state periodically
        this.broadcastState();
    }
    
    checkDoorInteraction() {
        const player = this.gameState.player;
        const location = this.gameState.currentLocation === 'town' ? this.gameState.town : this.gameState.dungeon;
        if (!location) return;
        
        const tileX = Math.floor(player.position.x);
        const tileY = Math.floor(player.position.y);
        const tile = location.tiles[tileY]?.[tileX];
        
        if (tile?.type === 'door' && this.gameState.currentLocation === 'town') {
            // Check if we're at a different shop than currently open
            if (this.currentOpenShop && this.currentOpenShop !== tile.buildingId) {
                this.closeShop();
            }
            if (!this.currentOpenShop) {
                this.openShop(tile.buildingId, tile.buildingName);
            }
        } else if (tile?.type === 'stairs_up' && this.gameState.currentLocation === 'dungeon') {
            this.teleportToTown();
        } else {
            // Not on a door, close any open shop
            if (this.currentOpenShop) {
                this.closeShop();
            }
        }
    }
    
    openShop(shopId, shopName) {
        if (shopId === 'dungeon_entrance') {
            this.enterDungeon();
            return;
        }
        
        if (shopId === 'quest_board') {
            this.showToast('Check your quest panel for available quests!', 'info');
            return;
        }
        
        const items = this.gameState.shops[shopId] || [];
        this.currentOpenShop = shopId; // Track which shop is open
        window.dispatchEvent(new CustomEvent('open-shop', {
            detail: {
                shopId,
                shopName,
                items,
                playerGold: this.gameState.player.gold,
                playerPower: this.getPlayerPower(),
            }
        }));
    }
    
    closeShop() {
        if (this.currentOpenShop) {
            this.currentOpenShop = null;
            window.dispatchEvent(new CustomEvent('close-shop'));
        }
    }
    
    enterDungeon() {
        if (this.gameState.currentLocation === 'dungeon') return;
        
        this.gameState.currentLocation = 'dungeon';
        this.gameState.player.position = { ...this.gameState.dungeon.entrance };
        soundManager.startMusic('dungeon');
        this.showToast('You descend into the dungeon...', 'info');
    }
    
    teleportToTown() {
        if (this.gameState.currentLocation === 'town') return;
        
        soundManager.play('teleport');
        soundManager.startMusic('town');
        this.gameState.currentLocation = 'town';
        this.gameState.player.position = { x: 15, y: 12 };
        this.respawnCreeps();
        this.showToast('You return to town safely.', 'success');
    }
    
    respawnCreeps() {
        for (const creep of this.gameState.creeps) {
            creep.health = creep.maxHealth;
            creep.position = { ...creep.spawnPosition };
            creep.state = 'idle';
            creep.stunned = 0;
            creep.slowed = 0;
        }
    }
    
    updateCreeps(deltaTime) {
        const player = this.gameState.player;
        
        for (const creep of this.gameState.creeps) {
            if (creep.health <= 0) continue;
            
            creep.stunned = Math.max(0, creep.stunned - deltaTime);
            creep.slowed = Math.max(0, creep.slowed - deltaTime);
            creep.attackCooldown = Math.max(0, creep.attackCooldown - deltaTime);
            
            if (creep.stunned > 0) continue;
            
            const dx = player.position.x - creep.position.x;
            const dy = player.position.y - creep.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const aggroRange = creep.isBoss ? 12 : 8;
            
            if (distance < aggroRange) {
                creep.state = 'aggro';
                
                if (distance > creep.attackRange) {
                    const speed = creep.slowed > 0 ? creep.speed * 0.5 : creep.speed;
                    const moveX = (dx / distance) * speed * deltaTime / 1000;
                    const moveY = (dy / distance) * speed * deltaTime / 1000;
                    
                    const newX = creep.position.x + moveX;
                    const newY = creep.position.y + moveY;
                    
                    if (this.isWalkable(newX, creep.position.y)) creep.position.x = newX;
                    if (this.isWalkable(creep.position.x, newY)) creep.position.y = newY;
                }
                
                if (distance <= creep.attackRange && creep.attackCooldown <= 0) {
                    this.creepAttackPlayer(creep);
                    creep.attackCooldown = creep.attackCooldown || 1500;
                }
            } else {
                creep.state = 'idle';
            }
        }
    }
    
    creepAttackPlayer(creep) {
        const player = this.gameState.player;
        const stats = this.getEffectiveStats();
        
        // Calculate damage reduction
        let dr = Math.floor((stats.constitution - 10) / 2) * 0.5;
        for (const item of Object.values(player.equipment)) {
            if (item?.armor) dr += item.armor * (item.damageReduction || 0.1);
        }
        dr = Math.min(dr, 75);
        
        let damage = Math.floor(creep.damage * (1 - dr / 100));
        damage = Math.max(1, damage);
        
        player.health -= damage;
        
        this.gameState.particles.push({
            type: 'damage',
            x: player.position.x,
            y: player.position.y,
            text: `-${damage}`,
            color: '#FF0000',
            life: 1000,
        });
        
        // Play player hurt sound
        soundManager.play('player_hurt');
        
        if (player.health <= 0) {
            this.handlePlayerDeath();
        }
    }
    
    handlePlayerDeath() {
        const player = this.gameState.player;
        player.health = player.maxHealth;
        this.gameState.currentLocation = 'town';
        player.position = { x: 15, y: 12 };
        this.respawnCreeps();
        this.showToast('You have fallen... but death is not the end.', 'error');
    }
    
    playerAttack(isPrimary, targetX, targetY) {
        const player = this.gameState.player;
        const attack = isPrimary ? player.class.primaryAttack : player.class.secondaryAttack;
        const cooldown = isPrimary ? player.primaryCooldown : player.secondaryCooldown;
        
        if (cooldown > 0 || player.stunned > 0) return;
        if (attack.manaCost > player.mana) {
            this.showToast('Not enough mana!', 'error');
            return;
        }
        if (attack.requiresAmmo && player.ammo < (attack.ammoCount || 1)) {
            this.showToast("You're out of arrows!", 'error');
            return;
        }
        
        player.mana -= attack.manaCost;
        if (attack.requiresAmmo) player.ammo -= attack.ammoCount || 1;
        
        if (isPrimary) player.primaryCooldown = attack.cooldown;
        else player.secondaryCooldown = attack.cooldown;
        
        const dx = targetX - player.position.x;
        const dy = targetY - player.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / dist;
        const dirY = dy / dist;
        
        player.facing = { x: dirX, y: dirY };
        
        // Start attack animation
        this.attackAnimation = {
            active: true,
            type: attack.projectile ? (player.classId === 'mage' ? 'magic' : 'ranged') : 'melee',
            startTime: performance.now(),
            duration: attack.projectile ? 200 : 300,
            angle: Math.atan2(dirY, dirX),
        };
        
        // Play sound effect
        if (player.classId === 'tank') {
            soundManager.play('sword_swing');
        } else if (player.classId === 'mage') {
            soundManager.play('fireball');
        } else {
            soundManager.play('arrow');
        }
        
        // Calculate damage
        const stats = this.getEffectiveStats();
        let baseDamage = attack.damage;
        
        // Add weapon damage
        const weapon = player.equipment.mainhand;
        if (weapon) baseDamage += weapon.damage;
        
        // Stat bonus
        if (player.classId === 'tank') baseDamage += Math.floor((stats.strength - 10) / 2) * 2;
        else if (player.classId === 'mage') baseDamage += Math.floor((stats.intelligence - 10) / 2) * 3;
        else baseDamage += Math.floor((stats.dexterity - 10) / 2) * 2;
        
        // Crit check
        const critChance = Math.floor((stats.dexterity - 10) / 2) * 2;
        if (Math.random() * 100 < critChance) {
            baseDamage = Math.floor(baseDamage * 2);
        }
        
        if (attack.projectile) {
            const projectileCount = attack.projectileCount || 1;
            const spread = projectileCount > 1 ? 0.3 : 0;
            
            for (let i = 0; i < projectileCount; i++) {
                const angleOffset = (i - (projectileCount - 1) / 2) * spread;
                const angle = Math.atan2(dirY, dirX) + angleOffset;
                
                this.gameState.projectiles.push({
                    x: player.position.x,
                    y: player.position.y,
                    vx: Math.cos(angle) * 15,
                    vy: Math.sin(angle) * 15,
                    damage: baseDamage,
                    damageType: player.classId === 'mage' ? 'fire' : 'physical',
                    fromPlayer: true,
                    aoe: attack.aoe,
                    stun: attack.stun,
                    slow: attack.slow,
                    slowDuration: attack.slowDuration,
                    life: 2000,
                    type: isPrimary ? 'primary' : 'secondary',
                });
            }
        } else {
            // Melee attack
            for (const creep of this.gameState.creeps) {
                if (creep.health <= 0) continue;
                
                const cdx = creep.position.x - player.position.x;
                const cdy = creep.position.y - player.position.y;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                
                if (cdist <= attack.range) {
                    const dot = (cdx * dirX + cdy * dirY) / cdist;
                    if (dot > 0.5) {
                        this.damageCreep(creep, baseDamage);
                        if (attack.stun) creep.stunned = attack.stun;
                    }
                }
            }
        }
    }
    
    damageCreep(creep, damage) {
        creep.health -= damage;
        
        // Play hit sound
        soundManager.play('enemy_hit');
        
        this.gameState.particles.push({
            type: 'damage',
            x: creep.position.x,
            y: creep.position.y,
            text: `-${damage}`,
            color: '#FFFFFF',
            life: 1000,
        });
        
        this.renderer.addBloodParticle(creep.position.x, creep.position.y);
        
        if (creep.health <= 0) {
            this.handleCreepDeath(creep);
        }
    }
    
    handleCreepDeath(creep) {
        const player = this.gameState.player;
        player.killCount++;
        
        // Play death sound
        if (creep.isBoss) {
            soundManager.play('boss_death');
        } else {
            soundManager.play('enemy_death');
        }
        
        // Update quests
        for (const quest of this.gameState.quests) {
            if (!quest.completed) {
                if (quest.type === 'kill' && creep.id.includes(quest.target)) {
                    quest.progress++;
                    if (quest.progress >= quest.required) {
                        quest.completed = true;
                        this.showToast(`Quest completed: ${quest.title}`, 'success');
                        soundManager.play('quest_complete');
                    }
                } else if (quest.type === 'boss' && creep.isBoss) {
                    quest.progress = 1;
                    quest.completed = true;
                    this.showToast(`Quest completed: ${quest.title}`, 'success');
                    soundManager.play('quest_complete');
                }
            }
        }
        
        // Boss death
        if (creep.isBoss) {
            player.bossesDefeated++;
            player.gold += creep.goldReward;
            
            this.showToast(`${creep.name} defeated! +${creep.goldReward} gold`, 'success');
            
            setTimeout(() => {
                this.gameState.currentLocation = 'town';
                player.position = { x: 15, y: 12 };
                this.gameState.dungeonLevel++;
                this.gameState.dungeon = this.generateDungeon(this.gameState.dungeonLevel);
                this.refreshShops();
                this.generateQuests();
                soundManager.startMusic('town');
                soundManager.play('level_up');
                this.showToast(`A new dungeon has appeared... Level ${this.gameState.dungeonLevel}`, 'info');
            }, 2000);
        }
        
        // Stat gain
        const statKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
        const statGain = creep.isBoss ? 2 : 0.1;
        player.stats[randomStat] = (player.stats[randomStat] || 10) + statGain;
        
        // Recalculate max health/mana
        const stats = this.getEffectiveStats();
        player.maxHealth = player.class.baseHealth + Math.floor((stats.constitution - 10) / 2) * 10;
        player.maxMana = player.class.baseMana + Math.floor((stats.intelligence - 10) / 2) * 5;
    }
    
    updateProjectiles(deltaTime) {
        const toRemove = [];
        
        for (let i = 0; i < this.gameState.projectiles.length; i++) {
            const proj = this.gameState.projectiles[i];
            
            proj.x += proj.vx * deltaTime / 1000;
            proj.y += proj.vy * deltaTime / 1000;
            proj.life -= deltaTime;
            
            if (proj.life <= 0 || !this.isWalkable(proj.x, proj.y)) {
                toRemove.push(i);
                continue;
            }
            
            if (proj.fromPlayer) {
                for (const creep of this.gameState.creeps) {
                    if (creep.health <= 0) continue;
                    
                    const dx = proj.x - creep.position.x;
                    const dy = proj.y - creep.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 0.8) {
                        this.damageCreep(creep, proj.damage);
                        
                        if (proj.aoe) {
                            for (const other of this.gameState.creeps) {
                                if (other === creep || other.health <= 0) continue;
                                const odx = proj.x - other.position.x;
                                const ody = proj.y - other.position.y;
                                const odist = Math.sqrt(odx * odx + ody * ody);
                                if (odist < proj.aoe) {
                                    this.damageCreep(other, Math.floor(proj.damage * 0.5));
                                }
                            }
                        }
                        
                        if (proj.stun) creep.stunned = proj.stun;
                        if (proj.slow) creep.slowed = proj.slowDuration;
                        
                        toRemove.push(i);
                        break;
                    }
                }
            }
        }
        
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.gameState.projectiles.splice(toRemove[i], 1);
        }
    }
    
    updateParticles(deltaTime) {
        this.gameState.particles = this.gameState.particles.filter(p => {
            p.life -= deltaTime;
            p.y -= deltaTime / 1000;
            return p.life > 0;
        });
    }
    
    usePotion(type) {
        const player = this.gameState.player;
        
        if (type === 'health' && player.potions.health > 0) {
            player.potions.health--;
            const stats = this.getEffectiveStats();
            const healAmount = 50 + Math.floor((stats.wisdom - 10) / 2) * 10;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            
            this.gameState.particles.push({
                type: 'heal',
                x: player.position.x,
                y: player.position.y,
                text: `+${healAmount}`,
                color: '#00FF00',
                life: 1000,
            });
            soundManager.play('heal');
            this.showToast(`Healed for ${healAmount} HP`, 'success');
        } else if (type === 'mana' && player.potions.mana > 0) {
            player.potions.mana--;
            const stats = this.getEffectiveStats();
            const manaAmount = 40 + Math.floor((stats.wisdom - 10) / 2) * 8;
            player.mana = Math.min(player.maxMana, player.mana + manaAmount);
            
            this.gameState.particles.push({
                type: 'mana',
                x: player.position.x,
                y: player.position.y,
                text: `+${manaAmount}`,
                color: '#0080FF',
                life: 1000,
            });
            soundManager.play('mana');
            this.showToast(`Restored ${manaAmount} Mana`, 'success');
        } else {
            this.showToast('No potions available!', 'error');
        }
    }
    
    buyItem(shopId, itemIndex) {
        const items = this.gameState.shops[shopId];
        if (!items || !items[itemIndex]) return;
        
        const item = items[itemIndex];
        const player = this.gameState.player;
        
        if (player.gold < item.price) {
            this.showToast("Not enough gold!", 'error');
            return;
        }
        
        if (item.requiresPower > this.getPlayerPower()) {
            this.showToast("You need more power for this item!", 'error');
            return;
        }
        
        player.gold -= item.price;
        
        if (item.category === 'consumable') {
            if (item.type === 'health') player.potions.health++;
            else if (item.type === 'mana') player.potions.mana++;
        } else if (item.category === 'ammo') {
            player.ammo += item.quantity;
        } else {
            if (player.inventory.length < 20) {
                player.inventory.push(item);
            } else {
                this.showToast("Inventory full!", 'error');
                player.gold += item.price;
                return;
            }
        }
        
        items.splice(itemIndex, 1);
        soundManager.play('buy');
        this.showToast(`Purchased ${item.name}`, 'success');
        
        // Update shop dialog
        window.postMessage({
            eventName: 'shop-update',
            detail: { data: JSON.stringify({ items: items, playerGold: player.gold }) }
        }, '*');
    }
    
    equipItem(inventoryIndex) {
        const player = this.gameState.player;
        const item = player.inventory[inventoryIndex];
        if (!item || !item.slot) return;
        
        const slot = item.slot === 'twohand' ? 'mainhand' : item.slot;
        const current = player.equipment[slot];
        
        if (current) {
            player.inventory.push(current);
        }
        
        player.equipment[slot] = item;
        player.inventory.splice(inventoryIndex, 1);
        
        // Recalculate stats
        const stats = this.getEffectiveStats();
        player.maxHealth = player.class.baseHealth + Math.floor((stats.constitution - 10) / 2) * 10;
        player.maxMana = player.class.baseMana + Math.floor((stats.intelligence - 10) / 2) * 5;
        
        this.showToast(`Equipped ${item.name}`, 'success');
    }
    
    claimQuestReward(questId) {
        const questIndex = this.gameState.quests.findIndex(q => q.id === questId);
        const quest = this.gameState.quests[questIndex];
        if (!quest || !quest.completed || quest.claimed) return;
        
        this.gameState.player.gold += quest.reward;
        quest.claimed = true;
        
        soundManager.play('quest_complete');
        this.showToast(`Claimed ${quest.reward} gold!`, 'success');
        
        // Remove claimed quest and add a new one
        setTimeout(() => {
            this.gameState.quests.splice(questIndex, 1);
            this.addNewQuest();
        }, 500);
    }
    
    addNewQuest() {
        const creepTypes = ['skeleton', 'zombie', 'ghost', 'imp', 'orc', 'dark_mage'];
        const existingKillTargets = this.gameState.quests
            .filter(q => q.type === 'kill')
            .map(q => q.target);
        
        // Try to add a kill quest with a different target
        const availableTargets = creepTypes.filter(t => !existingKillTargets.includes(t));
        
        if (availableTargets.length > 0 || this.gameState.quests.filter(q => q.type === 'kill').length < 2) {
            const target = availableTargets.length > 0 
                ? availableTargets[Math.floor(Math.random() * availableTargets.length)]
                : creepTypes[Math.floor(Math.random() * creepTypes.length)];
            const count = 5 + Math.floor(Math.random() * 10) + this.gameState.dungeonLevel * 2;
            
            this.gameState.quests.push({
                id: `quest_${Date.now()}_${Math.random()}`,
                type: 'kill',
                title: `Slay ${count} ${target}s`,
                target,
                required: count,
                progress: 0,
                reward: count * 20 + this.gameState.dungeonLevel * 50,
                completed: false,
            });
        } else {
            // Add a boss quest if we have enough kill quests
            this.gameState.quests.push({
                id: `quest_${Date.now()}_${Math.random()}`,
                type: 'boss',
                title: 'Defeat the Dungeon Boss',
                target: 'boss',
                required: 1,
                progress: 0,
                reward: 200 * this.gameState.dungeonLevel,
                completed: false,
            });
        }
        
        this.showToast('New quest available!', 'info');
    }
    
    showToast(text, type = 'info') {
        window.dispatchEvent(new CustomEvent('game-toast', { detail: { text, type } }));
    }
    
    broadcastState() {
        window.postMessage({
            eventName: 'game-state-update',
            detail: {
                data: JSON.stringify({
                    player: this.gameState.player,
                    currentLocation: this.gameState.currentLocation,
                    town: this.gameState.town,
                    dungeon: this.gameState.dungeon,
                    creeps: this.gameState.creeps,
                    quests: this.gameState.quests,
                })
            }
        }, '*');
    }
}

// Initialize game
const game = new DungeonCrawlerGame();

// Add toast component to page
const toast = document.createElement('game-toast');
document.body.appendChild(toast);

// Add shop dialog
const shopDialog = document.createElement('shop-dialog');
document.body.appendChild(shopDialog);