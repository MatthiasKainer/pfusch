// Canvas Renderer - Handles all visual rendering with particle effects
import { GAME_CONFIG } from './constants.js';

export class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = GAME_CONFIG.TILE_SIZE;
        this.camera = { x: 0, y: 0 };
        this.animationFrame = 0;
        this.time = 0;
        this.sprites = new Map();
        
        // Particle systems
        this.bloodParticles = [];
        this.magicParticles = [];
        this.torchFlicker = [];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    updateCamera(playerX, playerY) {
        const targetX = playerX * this.tileSize - this.canvas.width / 2;
        const targetY = playerY * this.tileSize - this.canvas.height / 2;
        
        // Smooth camera follow
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    }
    
    render(gameState, deltaTime, attackAnimation = null) {
        this.time += deltaTime;
        this.animationFrame = Math.floor(this.time / 200) % 4;
        
        const ctx = this.ctx;
        const { player, currentLocation, creeps, projectiles, particles } = gameState;
        const location = currentLocation === 'town' ? gameState.town : gameState.dungeon;
        
        if (!location || !player) return;
        
        // Store attack animation for player rendering
        this.currentAttackAnimation = attackAnimation;
        
        if (!location || !player) return;
        
        // Update camera
        this.updateCamera(player.position.x, player.position.y);
        
        // Clear canvas with ambient color
        if (currentLocation === 'dungeon') {
            ctx.fillStyle = '#0a0505';
        } else {
            // Sky gradient for town
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(0.6, '#87CEEB');
            gradient.addColorStop(1, '#90EE90');
            ctx.fillStyle = gradient;
        }
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(this.camera.x / this.tileSize));
        const startTileY = Math.max(0, Math.floor(this.camera.y / this.tileSize));
        const endTileX = Math.min(location.width, Math.ceil((this.camera.x + this.canvas.width) / this.tileSize) + 1);
        const endTileY = Math.min(location.height, Math.ceil((this.camera.y + this.canvas.height) / this.tileSize) + 1);
        
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render tiles
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tile = location.tiles[y]?.[x];
                if (tile) {
                    this.renderTile(ctx, tile, x, y, currentLocation);
                }
            }
        }
        
        // Render creeps (only in dungeon)
        if (currentLocation === 'dungeon' && creeps) {
            for (const creep of creeps) {
                if (creep.health > 0) {
                    this.renderCreep(ctx, creep);
                }
            }
        }
        
        // Render player
        this.renderPlayer(ctx, player);
        
        // Render projectiles
        if (projectiles) {
            for (const proj of projectiles) {
                this.renderProjectile(ctx, proj);
            }
        }
        
        // Render particles
        if (particles) {
            for (const particle of particles) {
                this.renderParticle(ctx, particle);
            }
        }
        
        // Render local particles
        this.updateAndRenderParticles(ctx, deltaTime);
        
        // Dungeon atmosphere effects
        if (currentLocation === 'dungeon') {
            this.renderDungeonAtmosphere(ctx);
        }
        
        ctx.restore();
        
        // Render vignette
        this.renderVignette(ctx);
    }
    
    renderTile(ctx, tile, x, y, location) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const size = this.tileSize;
        
        switch (tile.type) {
            case 'floor':
                this.drawDungeonFloor(ctx, px, py, size);
                break;
            case 'wall':
                this.drawWall(ctx, px, py, size);
                break;
            case 'grass':
                this.drawGrass(ctx, px, py, size, x, y);
                break;
            case 'path':
                this.drawPath(ctx, px, py, size);
                break;
            case 'building':
                this.drawBuilding(ctx, px, py, size, tile.buildingId);
                break;
            case 'door':
                this.drawDoor(ctx, px, py, size, tile.buildingName);
                break;
            case 'fence':
                this.drawFence(ctx, px, py, size);
                break;
            case 'stairs_up':
                this.drawStairs(ctx, px, py, size);
                break;
            case 'boss_spawn':
                this.drawBossSpawn(ctx, px, py, size);
                break;
        }
    }
    
    drawDungeonFloor(ctx, x, y, size) {
        // Dark stone with blood undertones
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, '#1a1010');
        gradient.addColorStop(0.5, '#201515');
        gradient.addColorStop(1, '#1a1010');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Cracks and texture
        ctx.strokeStyle = 'rgba(139, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + size * 0.2, y);
        ctx.lineTo(x + size * 0.3, y + size);
        ctx.stroke();
        
        // Subtle border
        ctx.strokeStyle = 'rgba(74, 0, 0, 0.3)';
        ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    }
    
    drawWall(ctx, x, y, size) {
        // Deep crimson-black wall
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#0a0505');
        gradient.addColorStop(0.3, '#1a0a0a');
        gradient.addColorStop(0.7, '#1a0a0a');
        gradient.addColorStop(1, '#0a0505');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Brick pattern
        ctx.strokeStyle = '#050202';
        ctx.lineWidth = 1;
        for (let by = 0; by < size; by += 8) {
            const offset = (Math.floor(by / 8) % 2) * 8;
            for (let bx = offset - 8; bx < size + 8; bx += 16) {
                ctx.strokeRect(x + bx, y + by, 16, 8);
            }
        }
        
        // Glowing mortar
        ctx.strokeStyle = 'rgba(139, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        for (let by = 0; by < size; by += 8) {
            ctx.beginPath();
            ctx.moveTo(x, y + by);
            ctx.lineTo(x + size, y + by);
            ctx.stroke();
        }
    }
    
    drawGrass(ctx, x, y, size, tileX, tileY) {
        // Lush green grass
        const baseGreen = 100 + Math.sin(tileX * 0.5 + tileY * 0.3) * 20;
        ctx.fillStyle = `rgb(34, ${baseGreen}, 34)`;
        ctx.fillRect(x, y, size, size);
        
        // Grass blades
        const seed = tileX * 1000 + tileY;
        const random = this.seededRandom(seed);
        for (let i = 0; i < 8; i++) {
            const gx = x + random() * size;
            const gy = y + random() * size;
            const height = 3 + random() * 4;
            const shade = 80 + random() * 60;
            ctx.fillStyle = `rgb(${20 + random() * 20}, ${shade}, ${20 + random() * 20})`;
            ctx.fillRect(gx, gy, 2, height);
        }
    }
    
    drawPath(ctx, x, y, size) {
        // Cobblestone path
        ctx.fillStyle = '#6B5344';
        ctx.fillRect(x, y, size, size);
        
        // Cobblestones
        ctx.fillStyle = '#8B7355';
        for (let py = 0; py < size; py += 10) {
            for (let px = 0; px < size; px += 10) {
                ctx.beginPath();
                ctx.ellipse(x + px + 5, y + py + 5, 4, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
    }
    
    drawBuilding(ctx, x, y, size, buildingId) {
        // Wood building
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x, y, size, size);
        
        // Wood grain
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + i * 8 + 4);
            ctx.lineTo(x + size, y + i * 8 + 4);
            ctx.stroke();
        }
        
        // Roof trim on top
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(x, y, size, 4);
    }
    
    drawDoor(ctx, x, y, size, buildingName) {
        // Path under door
        ctx.fillStyle = '#6B5344';
        ctx.fillRect(x, y, size, size);
        
        // Door mat
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 4, y + size - 8, size - 8, 6);
        
        // Interaction indicator
        const pulse = Math.sin(this.time / 300) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Building name
        if (buildingName) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 10px MedievalSharp, serif';
            ctx.textAlign = 'center';
            ctx.fillText(buildingName.split(' ')[0], x + size / 2, y - 4);
        }
    }
    
    drawFence(ctx, x, y, size) {
        // Grass background
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x, y, size, size);
        
        // Fence posts
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x + 2, y + 4, 4, size - 8);
        ctx.fillRect(x + size - 6, y + 4, 4, size - 8);
        
        // Horizontal beams
        ctx.fillRect(x, y + 8, size, 4);
        ctx.fillRect(x, y + size - 12, size, 4);
    }
    
    drawStairs(ctx, x, y, size) {
        // Portal effect
        const pulse = Math.sin(this.time / 200) * 0.3 + 0.7;
        
        ctx.fillStyle = '#0a0505';
        ctx.fillRect(x, y, size, size);
        
        // Swirling portal
        const gradient = ctx.createRadialGradient(
            x + size/2, y + size/2, 0,
            x + size/2, y + size/2, size/2
        );
        gradient.addColorStop(0, `rgba(139, 0, 0, ${pulse})`);
        gradient.addColorStop(0.5, `rgba(74, 0, 0, ${pulse * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Arrow down indicator
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(x + size/2, y + size - 6);
        ctx.lineTo(x + size/2 - 6, y + 6);
        ctx.lineTo(x + size/2 + 6, y + 6);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossSpawn(ctx, x, y, size) {
        const pulse = Math.sin(this.time / 150) * 0.5 + 0.5;
        
        ctx.fillStyle = '#0a0000';
        ctx.fillRect(x, y, size, size);
        
        // Pentagram
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = x + size / 2;
        const cy = y + size / 2;
        const r = size / 2 - 4;
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Glow
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${pulse * 0.4})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
    }
    
    renderPlayer(ctx, player) {
        const x = player.position.x * this.tileSize;
        const y = player.position.y * this.tileSize;
        const size = this.tileSize;
        
        ctx.save();
        ctx.translate(x, y);
        
        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(size/2, size - 4, size/3, size/8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        const classColors = {
            tank: { body: '#4a5568', accent: '#718096', weapon: '#A0AEC0' },
            mage: { body: '#553c9a', accent: '#805ad5', weapon: '#9F7AEA' },
            ranger: { body: '#2f5a2f', accent: '#48bb78', weapon: '#68D391' },
        };
        const colors = classColors[player.classId] || classColors.tank;
        
        // Animation bounce
        const bounce = Math.sin(this.time / 100) * 2;
        
        // Attack animation state
        const anim = this.currentAttackAnimation;
        let attackProgress = 0;
        let isAttacking = false;
        
        if (anim && anim.active) {
            const elapsed = performance.now() - anim.startTime;
            if (elapsed < anim.duration) {
                attackProgress = elapsed / anim.duration;
                isAttacking = true;
            }
        }
        
        // Armor/Robe
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.moveTo(size/2 - 8, size - 8);
        ctx.lineTo(size/2 + 8, size - 8);
        ctx.lineTo(size/2 + 10, size/2 + 4 + bounce);
        ctx.lineTo(size/2 - 10, size/2 + 4 + bounce);
        ctx.closePath();
        ctx.fill();
        
        // Head
        ctx.fillStyle = player.gender === 'female' ? '#FDBF9C' : '#D4A373';
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair
        ctx.fillStyle = player.gender === 'female' ? '#8B4513' : '#2D1B0E';
        ctx.beginPath();
        if (player.gender === 'female') {
            ctx.ellipse(size/2, size/3 - 4 + bounce, 8, 5, 0, Math.PI, 0);
            ctx.fill();
            // Long hair
            ctx.fillRect(size/2 - 8, size/3 + bounce, 3, 12);
            ctx.fillRect(size/2 + 5, size/3 + bounce, 3, 12);
        } else {
            ctx.ellipse(size/2, size/3 - 3 + bounce, 7, 4, 0, Math.PI, 0);
            ctx.fill();
        }
        
        // Weapon based on facing direction and attack animation
        const weaponAngle = Math.atan2(player.facing.y, player.facing.x);
        ctx.save();
        ctx.translate(size/2, size/2 + bounce);
        
        // Attack swing animation
        let swingOffset = 0;
        if (isAttacking && anim.type === 'melee') {
            // Swing arc: -45deg to +45deg
            swingOffset = Math.sin(attackProgress * Math.PI) * 1.2;
        }
        
        ctx.rotate(weaponAngle + swingOffset);
        
        // Draw weapon with attack effect
        ctx.fillStyle = colors.weapon;
        if (player.classId === 'tank') {
            // Sword with swing trail
            if (isAttacking) {
                // Motion blur / trail effect
                ctx.globalAlpha = 0.3;
                for (let i = 3; i > 0; i--) {
                    ctx.save();
                    ctx.rotate(-swingOffset * i * 0.2);
                    ctx.fillRect(8, -2, 16, 4);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
            }
            ctx.fillRect(8, -2, 16, 4);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(6, -4, 4, 8);
            
            // Slash effect
            if (isAttacking && attackProgress > 0.2 && attackProgress < 0.8) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${1 - attackProgress})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 20, -0.5, 0.5);
                ctx.stroke();
            }
        } else if (player.classId === 'mage') {
            // Staff
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(6, -2, 18, 3);
            
            // Orb with cast effect
            const orbSize = isAttacking ? 4 + Math.sin(attackProgress * Math.PI * 4) * 2 : 4;
            ctx.fillStyle = '#9F7AEA';
            ctx.beginPath();
            ctx.arc(24, 0, orbSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Magic cast particles
            if (isAttacking) {
                ctx.fillStyle = `rgba(159, 122, 234, ${1 - attackProgress})`;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + this.time / 100;
                    const dist = 8 + attackProgress * 15;
                    ctx.beginPath();
                    ctx.arc(24 + Math.cos(angle) * dist, Math.sin(angle) * dist, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            // Bow with draw animation
            const drawBack = isAttacking ? Math.sin(attackProgress * Math.PI) * 5 : 0;
            
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(12 - drawBack, 0, 10, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            
            // Bowstring
            ctx.strokeStyle = '#CCC';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(12 - drawBack + 8, -8);
            ctx.lineTo(12 - drawBack - 3, 0);
            ctx.lineTo(12 - drawBack + 8, 8);
            ctx.stroke();
            
            // Arrow being drawn
            if (isAttacking && attackProgress < 0.5) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(0 - drawBack, -1, 12, 2);
                ctx.fillStyle = '#A0A0A0';
                ctx.beginPath();
                ctx.moveTo(12 - drawBack, 0);
                ctx.lineTo(15 - drawBack, -2);
                ctx.lineTo(15 - drawBack, 2);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
        
        // Health bar above player
        const healthPercent = player.health / player.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(4, -8, size - 8, 4);
        ctx.fillStyle = healthPercent > 0.3 ? '#22c55e' : '#ef4444';
        ctx.fillRect(4, -8, (size - 8) * healthPercent, 4);
        
        ctx.restore();
    }
    
    renderCreep(ctx, creep) {
        const x = creep.position.x * this.tileSize;
        const y = creep.position.y * this.tileSize;
        const size = this.tileSize;
        const isBoss = creep.isBoss;
        const scale = isBoss ? 1.5 : 1;
        
        ctx.save();
        ctx.translate(x, y);
        if (isBoss) {
            ctx.translate(-size * 0.25, -size * 0.25);
            ctx.scale(scale, scale);
        }
        
        // Stun effect
        if (creep.stunned > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(this.time / 50) * 0.2;
        }
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(size/2, size - 2, size/3, size/8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        const bounce = creep.state === 'aggro' ? Math.sin(this.time / 80) * 2 : 0;
        
        // Different creep appearances
        switch (creep.sprite) {
            case 'skeleton':
                this.drawSkeleton(ctx, size, bounce, isBoss);
                break;
            case 'zombie':
                this.drawZombie(ctx, size, bounce);
                break;
            case 'ghost':
                this.drawGhost(ctx, size);
                break;
            case 'imp':
                this.drawImp(ctx, size, bounce);
                break;
            case 'orc':
                this.drawOrc(ctx, size, bounce);
                break;
            case 'dark_mage':
                this.drawDarkMage(ctx, size, bounce);
                break;
            case 'skeleton_king':
                this.drawSkeletonKing(ctx, size, bounce);
                break;
            case 'demon_lord':
                this.drawDemonLord(ctx, size, bounce);
                break;
            case 'lich':
                this.drawLich(ctx, size, bounce);
                break;
            case 'dragon':
                this.drawDragon(ctx, size, bounce);
                break;
            default:
                this.drawGenericEnemy(ctx, size, bounce);
        }
        
        // Health bar
        const healthPercent = creep.health / creep.maxHealth;
        const barWidth = isBoss ? size * 1.5 : size - 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(isBoss ? -size * 0.25 : 4, -10, barWidth, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(isBoss ? -size * 0.25 : 4, -10, barWidth * healthPercent, 5);
        
        // Boss name
        if (isBoss) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Cinzel, serif';
            ctx.textAlign = 'center';
            ctx.fillText(creep.name, size/2, -16);
        }
        
        ctx.restore();
    }
    
    drawSkeleton(ctx, size, bounce, isBoss) {
        // Bones color
        ctx.fillStyle = isBoss ? '#FFE4B5' : '#E8E8D0';
        
        // Skull
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye sockets
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(size/2 - 3, size/3 + bounce - 1, 2, 0, Math.PI * 2);
        ctx.arc(size/2 + 3, size/3 + bounce - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ribcage
        ctx.fillStyle = isBoss ? '#FFE4B5' : '#E8E8D0';
        ctx.fillRect(size/2 - 6, size/2 + bounce, 12, 10);
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(size/2 - 8, size/2 + 2 + i * 3 + bounce, 16, 2);
        }
        
        // Arms
        ctx.fillRect(size/2 - 12, size/2 + bounce, 4, 12);
        ctx.fillRect(size/2 + 8, size/2 + bounce, 4, 12);
        
        // Sword
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(size/2 + 10, size/2 - 8 + bounce, 3, 20);
    }
    
    drawZombie(ctx, size, bounce) {
        // Rotting green
        ctx.fillStyle = '#5a7247';
        
        // Body
        ctx.fillRect(size/2 - 8, size/2 + bounce, 16, 14);
        
        // Head
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Wounds
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(size/2 + 2, size/3 + bounce, 3, 4);
        
        // Eyes
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(size/2 - 3, size/3 + bounce - 1, 2, 0, Math.PI * 2);
        ctx.arc(size/2 + 3, size/3 + bounce - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Arms reaching out
        ctx.fillStyle = '#5a7247';
        ctx.save();
        ctx.translate(size/2, size/2 + bounce);
        ctx.rotate(Math.sin(this.time / 200) * 0.3);
        ctx.fillRect(-16, -2, 10, 4);
        ctx.restore();
    }
    
    drawGhost(ctx, size) {
        const float = Math.sin(this.time / 300) * 4;
        
        // Translucent body
        ctx.fillStyle = 'rgba(200, 200, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(size/2, size/4 + float);
        ctx.bezierCurveTo(size/2 + 12, size/3 + float, size/2 + 10, size - 4, size/2 + 6, size);
        ctx.lineTo(size/2 - 6, size);
        ctx.bezierCurveTo(size/2 - 10, size - 4, size/2 - 12, size/3 + float, size/2, size/4 + float);
        ctx.fill();
        
        // Face
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(size/2 - 4, size/3 + float, 3, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(size/2 + 4, size/3 + float, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wail mouth
        ctx.beginPath();
        ctx.ellipse(size/2, size/2 + float, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawImp(ctx, size, bounce) {
        // Red demon
        ctx.fillStyle = '#8B0000';
        
        // Body
        ctx.beginPath();
        ctx.ellipse(size/2, size/2 + 4 + bounce, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Horns
        ctx.fillStyle = '#4A0000';
        ctx.beginPath();
        ctx.moveTo(size/2 - 6, size/4 + bounce);
        ctx.lineTo(size/2 - 10, size/8 + bounce);
        ctx.lineTo(size/2 - 4, size/4 + bounce);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size/2 + 6, size/4 + bounce);
        ctx.lineTo(size/2 + 10, size/8 + bounce);
        ctx.lineTo(size/2 + 4, size/4 + bounce);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(size/2 - 2, size/3 + bounce, 2, 0, Math.PI * 2);
        ctx.arc(size/2 + 2, size/3 + bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings
        ctx.fillStyle = '#4A0000';
        ctx.beginPath();
        ctx.moveTo(size/2 - 8, size/2 + bounce);
        ctx.lineTo(size/2 - 16, size/3 + bounce);
        ctx.lineTo(size/2 - 10, size/2 + 6 + bounce);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size/2 + 8, size/2 + bounce);
        ctx.lineTo(size/2 + 16, size/3 + bounce);
        ctx.lineTo(size/2 + 10, size/2 + 6 + bounce);
        ctx.fill();
    }
    
    drawOrc(ctx, size, bounce) {
        // Green skin
        ctx.fillStyle = '#4a6741';
        
        // Body
        ctx.fillRect(size/2 - 10, size/2 + bounce, 20, 16);
        
        // Head
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Tusks
        ctx.fillStyle = '#E8E8D0';
        ctx.beginPath();
        ctx.moveTo(size/2 - 6, size/2 - 2 + bounce);
        ctx.lineTo(size/2 - 8, size/3 + 2 + bounce);
        ctx.lineTo(size/2 - 4, size/2 - 2 + bounce);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size/2 + 6, size/2 - 2 + bounce);
        ctx.lineTo(size/2 + 8, size/3 + 2 + bounce);
        ctx.lineTo(size/2 + 4, size/2 - 2 + bounce);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(size/2 - 3, size/3 + bounce - 2, 2, 0, Math.PI * 2);
        ctx.arc(size/2 + 3, size/3 + bounce - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Axe
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(size/2 + 10, size/4 + bounce, 3, 24);
        ctx.fillStyle = '#A0A0A0';
        ctx.beginPath();
        ctx.moveTo(size/2 + 13, size/4 + bounce);
        ctx.lineTo(size/2 + 20, size/4 + 4 + bounce);
        ctx.lineTo(size/2 + 13, size/4 + 8 + bounce);
        ctx.fill();
    }
    
    drawDarkMage(ctx, size, bounce) {
        // Dark robes
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.moveTo(size/2, size/3 + bounce);
        ctx.lineTo(size/2 + 12, size - 2);
        ctx.lineTo(size/2 - 12, size - 2);
        ctx.closePath();
        ctx.fill();
        
        // Hood
        ctx.beginPath();
        ctx.arc(size/2, size/3 + bounce, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing eyes
        ctx.fillStyle = '#9F7AEA';
        ctx.beginPath();
        ctx.arc(size/2 - 3, size/3 + bounce, 2, 0, Math.PI * 2);
        ctx.arc(size/2 + 3, size/3 + bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Staff with orb
        ctx.fillStyle = '#4A0000';
        ctx.fillRect(size/2 - 14, size/4 + bounce, 3, 22);
        const orbPulse = Math.sin(this.time / 150) * 2 + 6;
        ctx.fillStyle = '#9F7AEA';
        ctx.beginPath();
        ctx.arc(size/2 - 12, size/4 - 2 + bounce, orbPulse, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawSkeletonKing(ctx, size, bounce) {
        this.drawSkeleton(ctx, size, bounce, true);
        
        // Crown
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(size/2 - 8, size/4 + bounce);
        ctx.lineTo(size/2 - 6, size/8 + bounce);
        ctx.lineTo(size/2 - 2, size/4 - 4 + bounce);
        ctx.lineTo(size/2, size/8 - 4 + bounce);
        ctx.lineTo(size/2 + 2, size/4 - 4 + bounce);
        ctx.lineTo(size/2 + 6, size/8 + bounce);
        ctx.lineTo(size/2 + 8, size/4 + bounce);
        ctx.closePath();
        ctx.fill();
    }
    
    drawDemonLord(ctx, size, bounce) {
        this.drawImp(ctx, size, bounce);
        
        // Larger, more menacing
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(size/2, size/2 + bounce, size/2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawLich(ctx, size, bounce) {
        this.drawDarkMage(ctx, size, bounce);
        
        // Frost aura
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size/2, size/2 + bounce, size/2 - 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawDragon(ctx, size, bounce) {
        // Dragon body
        ctx.fillStyle = '#4A0000';
        ctx.beginPath();
        ctx.ellipse(size/2, size/2 + bounce, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.beginPath();
        ctx.ellipse(size/2 + 10, size/3 + bounce, 8, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(size/2 + 12, size/3 - 2 + bounce, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings
        ctx.fillStyle = '#2A0000';
        ctx.beginPath();
        ctx.moveTo(size/2 - 4, size/2 + bounce);
        ctx.lineTo(size/2 - 20, size/4 + bounce);
        ctx.lineTo(size/2 - 16, size/2 + bounce);
        ctx.lineTo(size/2 - 10, size/3 + bounce);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size/2 + 4, size/2 + bounce);
        ctx.lineTo(size/2 + 20, size/4 + bounce);
        ctx.lineTo(size/2 + 16, size/2 + bounce);
        ctx.fill();
        
        // Fire breath particles
        if (this.animationFrame % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(size/2 + 20, size/3 + bounce, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawGenericEnemy(ctx, size, bounce) {
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(size/2, size/2 + bounce, size/3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(size/2 - 4, size/2 - 2 + bounce, 3, 0, Math.PI * 2);
        ctx.arc(size/2 + 4, size/2 - 2 + bounce, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderProjectile(ctx, proj) {
        const x = proj.x * this.tileSize;
        const y = proj.y * this.tileSize;
        
        ctx.save();
        ctx.translate(x, y);
        
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle);
        
        if (proj.type === 'primary') {
            if (proj.damageType === 'fire' || proj.aoe) {
                // Fireball
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
                gradient.addColorStop(0, '#FFFF00');
                gradient.addColorStop(0.4, '#FF8800');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                
                // Trail particles
                this.addMagicParticle(proj.x, proj.y, '#FF4400');
            } else {
                // Arrow
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-12, -2, 20, 4);
                ctx.fillStyle = '#A0A0A0';
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(12, -4);
                ctx.lineTo(14, 0);
                ctx.lineTo(12, 4);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Secondary attack
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            gradient.addColorStop(0, '#00FFFF');
            gradient.addColorStop(0.5, '#0088FF');
            gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            
            this.addMagicParticle(proj.x, proj.y, '#00AAFF');
        }
        
        ctx.restore();
    }
    
    renderParticle(ctx, particle) {
        const x = particle.x * this.tileSize;
        const y = particle.y * this.tileSize;
        const alpha = particle.life / 1000;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = particle.color;
        ctx.font = 'bold 16px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(particle.text, x + this.tileSize/2, y);
        
        ctx.restore();
    }
    
    addMagicParticle(x, y, color) {
        if (Math.random() > 0.3) return;
        
        this.magicParticles.push({
            x: x * this.tileSize + Math.random() * 10 - 5,
            y: y * this.tileSize + Math.random() * 10 - 5,
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 2 - 1,
            life: 500,
            color,
            size: 2 + Math.random() * 3,
        });
    }
    
    addBloodParticle(x, y) {
        for (let i = 0; i < 5; i++) {
            this.bloodParticles.push({
                x: x * this.tileSize + this.tileSize/2,
                y: y * this.tileSize + this.tileSize/2,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * -4 - 2,
                life: 800,
                size: 2 + Math.random() * 3,
            });
        }
    }
    
    updateAndRenderParticles(ctx, deltaTime) {
        // Update and render magic particles
        for (let i = this.magicParticles.length - 1; i >= 0; i--) {
            const p = this.magicParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.magicParticles.splice(i, 1);
                continue;
            }
            
            const alpha = p.life / 500;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Update and render blood particles
        for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
            const p = this.bloodParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // Gravity
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.bloodParticles.splice(i, 1);
                continue;
            }
            
            const alpha = p.life / 800;
            ctx.fillStyle = '#8B0000';
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }
    
    renderDungeonAtmosphere(ctx) {
        // Ambient fog
        const fogIntensity = 0.1 + Math.sin(this.time / 2000) * 0.05;
        ctx.fillStyle = `rgba(139, 0, 0, ${fogIntensity})`;
        
        for (let i = 0; i < 5; i++) {
            const x = Math.sin(this.time / 3000 + i) * this.canvas.width / 2 + this.canvas.width / 2;
            const y = Math.cos(this.time / 4000 + i * 2) * this.canvas.height / 2 + this.canvas.height / 2;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 200);
            gradient.addColorStop(0, `rgba(139, 0, 0, ${fogIntensity})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    renderVignette(ctx) {
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 4,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    seededRandom(seed) {
        let s = seed;
        return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX + this.camera.x) / this.tileSize,
            y: (screenY + this.camera.y) / this.tileSize,
        };
    }
}