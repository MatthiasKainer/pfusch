// Pfusch UI Components for Dungeon Crawler
import { pfusch, html, css, script } from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";

// Character Selection Dialog
pfusch("character-select", { 
    open: true, 
    selectedClass: null, 
    selectedGender: null
}, (state, trigger) => [
    css`
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: ${state.open ? 'flex' : 'none'};
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
        }
        .dialog {
            background: linear-gradient(135deg, #1a1010 0%, #2a1515 50%, #1a0a0a 100%);
            border: 3px solid #D4AF37;
            border-radius: 12px;
            padding: 40px;
            max-width: 800px;
            width: 90%;
            box-shadow: 0 0 50px rgba(139, 0, 0, 0.5), inset 0 0 30px rgba(139, 0, 0, 0.2);
        }
        h1 {
            font-family: 'Cinzel', serif;
            font-size: 2.5rem;
            color: #D4AF37;
            text-align: center;
            margin-bottom: 10px;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        .subtitle {
            font-family: 'Crimson Text', serif;
            font-style: italic;
            color: #F5E6C8;
            text-align: center;
            margin-bottom: 30px;
        }
        .section-title {
            font-family: 'Cinzel', serif;
            color: #D4AF37;
            margin: 20px 0 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
        }
        .class-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .class-card {
            background: linear-gradient(180deg, rgba(74, 0, 0, 0.3), rgba(26, 10, 10, 0.8));
            border: 2px solid #4A0000;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        .class-card:hover {
            border-color: #D4AF37;
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(139, 0, 0, 0.4);
        }
        .class-card.selected {
            border-color: #FFD700;
            background: linear-gradient(180deg, rgba(139, 0, 0, 0.4), rgba(74, 0, 0, 0.6));
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
        }
        .class-icon { font-size: 3rem; margin-bottom: 10px; }
        .class-name {
            font-family: 'Cinzel', serif;
            font-size: 1.3rem;
            color: #F5E6C8;
            margin-bottom: 8px;
        }
        .class-desc {
            font-family: 'Crimson Text', serif;
            font-size: 0.9rem;
            color: #A0A0A0;
            line-height: 1.4;
        }
        .class-stats { margin-top: 12px; font-size: 0.8rem; color: #718096; }
        .stat-bonus { color: #48bb78; }
        .stat-penalty { color: #ef4444; }
        .gender-selection {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
        }
        .gender-btn {
            background: linear-gradient(180deg, rgba(74, 0, 0, 0.3), rgba(26, 10, 10, 0.8));
            border: 2px solid #4A0000;
            border-radius: 8px;
            padding: 15px 40px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Cinzel', serif;
            font-size: 1.1rem;
            color: #F5E6C8;
        }
        .gender-btn:hover { border-color: #D4AF37; }
        .gender-btn.selected {
            border-color: #FFD700;
            background: linear-gradient(180deg, rgba(139, 0, 0, 0.4), rgba(74, 0, 0, 0.6));
        }
        .start-btn {
            display: block;
            width: 100%;
            padding: 18px;
            font-family: 'Cinzel', serif;
            font-size: 1.4rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 3px;
            background: linear-gradient(180deg, #8B0000, #4A0000);
            border: 3px solid #D4AF37;
            color: #F5E6C8;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 8px;
        }
        .start-btn:hover:not(:disabled) {
            background: linear-gradient(180deg, #FF3030, #8B0000);
            box-shadow: 0 0 30px rgba(255, 48, 48, 0.5);
            transform: scale(1.02);
        }
        .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
    script(function() {
        window.addEventListener('game-initialized', () => {
            this.component.state.open = false;
        });
    }),
    html.div({ class: 'dialog' },
        html.h1('Depths of Crimson'),
        html.p({ class: 'subtitle' }, 'Choose your destiny...'),
        html.h3({ class: 'section-title' }, 'Select Your Class'),
        html.div({ class: 'class-grid' },
            html.div({ 
                class: `class-card ${state.selectedClass === 'tank' ? 'selected' : ''}`,
                click: () => state.selectedClass = 'tank'
            },
                html.div({ class: 'class-icon' }, '⚔️'),
                html.div({ class: 'class-name' }, 'Warrior'),
                html.div({ class: 'class-desc' }, 'Masters of melee combat and defense. High health and armor.'),
                html.div({ class: 'class-stats' },
                    html.span({ class: 'stat-bonus' }, '+STR +CON '),
                    html.span({ class: 'stat-penalty' }, '-DEX')
                )
            ),
            html.div({ 
                class: `class-card ${state.selectedClass === 'mage' ? 'selected' : ''}`,
                click: () => state.selectedClass = 'mage'
            },
                html.div({ class: 'class-icon' }, '🔮'),
                html.div({ class: 'class-name' }, 'Mage'),
                html.div({ class: 'class-desc' }, 'Wielders of arcane power. Devastating spells but fragile.'),
                html.div({ class: 'class-stats' },
                    html.span({ class: 'stat-bonus' }, '+INT +WIS '),
                    html.span({ class: 'stat-penalty' }, '-CON')
                )
            ),
            html.div({ 
                class: `class-card ${state.selectedClass === 'ranger' ? 'selected' : ''}`,
                click: () => state.selectedClass = 'ranger'
            },
                html.div({ class: 'class-icon' }, '🏹'),
                html.div({ class: 'class-name' }, 'Ranger'),
                html.div({ class: 'class-desc' }, 'Swift hunters with deadly precision. Requires arrows.'),
                html.div({ class: 'class-stats' },
                    html.span({ class: 'stat-bonus' }, '+DEX +STR '),
                    html.span({ class: 'stat-penalty' }, '-INT')
                )
            )
        ),
        html.h3({ class: 'section-title' }, 'Select Gender'),
        html.div({ class: 'gender-selection' },
            html.button({ 
                class: `gender-btn ${state.selectedGender === 'male' ? 'selected' : ''}`,
                click: () => state.selectedGender = 'male'
            }, '♂ Male'),
            html.button({ 
                class: `gender-btn ${state.selectedGender === 'female' ? 'selected' : ''}`,
                click: () => state.selectedGender = 'female'
            }, '♀ Female')
        ),
        html.button({ 
            class: 'start-btn',
            disabled: !state.selectedClass || !state.selectedGender,
            click: () => {
                if (state.selectedClass && state.selectedGender) {
                    trigger('start', { classId: state.selectedClass, gender: state.selectedGender });
                }
            }
        }, 'Begin Your Journey')
    )
]);

// Player Stats Panel
pfusch("player-stats", {
    health: 100, maxHealth: 100, mana: 50, maxMana: 50, gold: 0, className: 'Warrior',
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }
}, (state) => [
    css`
        :host { display: block; width: 280px; }
        .panel {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.85));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(139, 0, 0, 0.3);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
        }
        .class-name { font-family: 'Cinzel', serif; font-weight: 700; color: #D4AF37; font-size: 1.2rem; }
        .gold { font-family: 'MedievalSharp', cursive; color: #FFD700; font-size: 1.1rem; }
        .gold::before { content: '🪙 '; }
        .resource-container { margin-bottom: 12px; }
        .resource-label {
            display: flex;
            justify-content: space-between;
            font-family: 'Crimson Text', serif;
            font-size: 0.9rem;
            color: #F5E6C8;
            margin-bottom: 4px;
        }
        .resource-bar {
            height: 18px;
            background: #1a1a1a;
            border: 2px solid #4A0000;
            border-radius: 9px;
            overflow: hidden;
        }
        .resource-fill { height: 100%; transition: width 0.3s ease; }
        .health-fill { background: linear-gradient(90deg, #8B0000, #FF0000); }
        .mana-fill { background: linear-gradient(90deg, #000080, #0080FF); }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid rgba(212, 175, 55, 0.3);
        }
        .stat-item { display: flex; justify-content: space-between; font-family: 'Crimson Text', serif; font-size: 0.85rem; }
        .stat-name { color: #A0A0A0; text-transform: uppercase; font-size: 0.7rem; }
        .stat-value { color: #F5E6C8; font-weight: 600; }
    `,
    script(function() {
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'game-state-update') {
                const data = JSON.parse(e.data.detail.data);
                if (data.player) {
                    const p = data.player;
                    this.component.state.health = p.health;
                    this.component.state.maxHealth = p.maxHealth;
                    this.component.state.mana = p.mana;
                    this.component.state.maxMana = p.maxMana;
                    this.component.state.gold = p.gold;
                    this.component.state.className = p.class?.name || 'Hero';
                    this.component.state.stats = p.stats || {};
                }
            }
        });
    }),
    html.div({ class: 'panel' },
        html.div({ class: 'header' },
            html.span({ class: 'class-name' }, state.className),
            html.span({ class: 'gold' }, state.gold)
        ),
        html.div({ class: 'resource-container' },
            html.div({ class: 'resource-label' },
                html.span('Health'),
                html.span(`${Math.floor(state.health)} / ${state.maxHealth}`)
            ),
            html.div({ class: 'resource-bar' },
                html.div({ class: 'resource-fill health-fill', style: `width: ${(state.health / state.maxHealth) * 100}%` })
            )
        ),
        html.div({ class: 'resource-container' },
            html.div({ class: 'resource-label' },
                html.span('Mana'),
                html.span(`${Math.floor(state.mana)} / ${state.maxMana}`)
            ),
            html.div({ class: 'resource-bar' },
                html.div({ class: 'resource-fill mana-fill', style: `width: ${(state.mana / state.maxMana) * 100}%` })
            )
        ),
        html.div({ class: 'stats-grid' },
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'STR'), html.span({ class: 'stat-value' }, Math.floor(state.stats.strength || 10))),
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'DEX'), html.span({ class: 'stat-value' }, Math.floor(state.stats.dexterity || 10))),
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'CON'), html.span({ class: 'stat-value' }, Math.floor(state.stats.constitution || 10))),
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'INT'), html.span({ class: 'stat-value' }, Math.floor(state.stats.intelligence || 10))),
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'WIS'), html.span({ class: 'stat-value' }, Math.floor(state.stats.wisdom || 10))),
            html.div({ class: 'stat-item' }, html.span({ class: 'stat-name' }, 'CHA'), html.span({ class: 'stat-value' }, Math.floor(state.stats.charisma || 10)))
        )
    )
]);

// Quest Panel
pfusch("quest-panel", { quests: [], expanded: true }, (state) => [
    css`
        :host { display: block; width: 280px; }
        .panel {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.85));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(139, 0, 0, 0.3);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
            margin-bottom: 10px;
        }
        .title { font-family: 'Cinzel', serif; font-weight: 700; color: #D4AF37; font-size: 1.1rem; }
        .toggle { color: #D4AF37; font-size: 1.2rem; }
        .quest-list { display: ${state.expanded ? 'block' : 'none'}; }
        .quest-item {
            padding: 10px;
            margin-bottom: 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            border-left: 3px solid #4A0000;
        }
        .quest-item.completed { border-left-color: #48bb78; }
        .quest-title { font-family: 'Crimson Text', serif; font-weight: 600; color: #F5E6C8; font-size: 0.95rem; margin-bottom: 5px; }
        .quest-progress { font-size: 0.8rem; color: #A0A0A0; }
        .progress-bar { height: 6px; background: #1a1a1a; border-radius: 3px; margin-top: 5px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #D4AF37, #FFD700); transition: width 0.3s; }
        .quest-reward { font-size: 0.8rem; color: #FFD700; margin-top: 5px; }
        .claim-btn {
            display: block;
            width: 100%;
            margin-top: 8px;
            padding: 6px;
            background: linear-gradient(180deg, #48bb78, #2f855a);
            border: 1px solid #68d391;
            border-radius: 4px;
            color: white;
            font-family: 'Cinzel', serif;
            font-size: 0.8rem;
            cursor: pointer;
        }
        .claim-btn:hover { background: linear-gradient(180deg, #68d391, #48bb78); }
        .no-quests { font-family: 'Crimson Text', serif; font-style: italic; color: #A0A0A0; text-align: center; padding: 20px; }
    `,
    script(function() {
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'game-state-update') {
                const data = JSON.parse(e.data.detail.data);
                if (data.quests) this.component.state.quests = data.quests;
            }
        });
    }),
    html.div({ class: 'panel' },
        html.div({ class: 'header', click: () => state.expanded = !state.expanded },
            html.span({ class: 'title' }, '📜 Quests'),
            html.span({ class: 'toggle' }, state.expanded ? '▼' : '▶')
        ),
        html.div({ class: 'quest-list' },
            state.quests.length === 0 
                ? html.div({ class: 'no-quests' }, 'Visit the Quest Board in town')
                : state.quests.map(quest => 
                    html.div({ class: `quest-item ${quest.completed ? 'completed' : ''}` },
                        html.div({ class: 'quest-title' }, quest.title),
                        html.div({ class: 'quest-progress' }, `Progress: ${quest.progress} / ${quest.required}`),
                        html.div({ class: 'progress-bar' },
                            html.div({ class: 'progress-fill', style: `width: ${(quest.progress / quest.required) * 100}%` })
                        ),
                        html.div({ class: 'quest-reward' }, `Reward: 🪙 ${quest.reward}`),
                        quest.completed && !quest.claimed 
                            ? html.button({ class: 'claim-btn', click: () => window.postMessage({ type: 'claim-quest', questId: quest.id }, '*') }, 'Claim Reward')
                            : null
                    )
                )
        )
    )
]);

// Inventory Panel
pfusch("inventory-panel", {
    inventory: [], equipment: {}, potions: { health: 0, mana: 0 }, ammo: 0, classId: 'tank', expanded: false
}, (state) => [
    css`
        :host { display: block; width: 320px; }
        .panel {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.85));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(139, 0, 0, 0.3);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
            margin-bottom: 10px;
        }
        .title { font-family: 'Cinzel', serif; font-weight: 700; color: #D4AF37; font-size: 1.1rem; }
        .consumables { display: flex; gap: 10px; margin-bottom: 15px; }
        .consumable {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #4A0000;
            border-radius: 6px;
            font-family: 'Crimson Text', serif;
            color: #F5E6C8;
        }
        .consumable-icon { font-size: 1.3rem; }
        .consumable-count { font-weight: 600; font-size: 1.1rem; }
        .health-potion { border-color: #8B0000; }
        .mana-potion { border-color: #000080; }
        .key-hint { font-size: 0.7rem; color: #A0A0A0; display: block; }
        .equipment-section { display: ${state.expanded ? 'block' : 'none'}; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); }
        .section-title { font-family: 'Cinzel', serif; font-size: 0.9rem; color: #D4AF37; margin-bottom: 10px; }
        .equipment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .equipment-slot {
            aspect-ratio: 1;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #4A0000;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            color: #A0A0A0;
        }
        .equipment-slot.filled { border-color: #D4AF37; color: #F5E6C8; }
        .slot-icon { font-size: 1.2rem; margin-bottom: 2px; }
        .inventory-grid { display: ${state.expanded ? 'grid' : 'none'}; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .inventory-slot {
            aspect-ratio: 1;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid #333;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .inventory-slot:hover { border-color: #D4AF37; }
        .inventory-slot.filled { border-color: #4A0000; }
        .item-icon { font-size: 1.5rem; }
        .toggle { color: #D4AF37; font-size: 1.2rem; }
    `,
    script(function() {
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'game-state-update') {
                const data = JSON.parse(e.data.detail.data);
                if (data.player) {
                    this.component.state.inventory = data.player.inventory || [];
                    this.component.state.equipment = data.player.equipment || {};
                    this.component.state.potions = data.player.potions || { health: 0, mana: 0 };
                    this.component.state.ammo = data.player.ammo || 0;
                    this.component.state.classId = data.player.classId || 'tank';
                }
            }
        });
    }),
    html.div({ class: 'panel' },
        html.div({ class: 'header', click: () => state.expanded = !state.expanded },
            html.span({ class: 'title' }, '🎒 Inventory'),
            html.span({ class: 'toggle' }, state.expanded ? '▼' : '▶')
        ),
        html.div({ class: 'consumables' },
            html.div({ class: 'consumable health-potion' },
                html.span({ class: 'consumable-icon' }, '🧪'),
                html.div(html.span({ class: 'consumable-count' }, state.potions.health), html.span({ class: 'key-hint' }, '[1]'))
            ),
            state.classId === 'mage' 
                ? html.div({ class: 'consumable mana-potion' },
                    html.span({ class: 'consumable-icon' }, '💧'),
                    html.div(html.span({ class: 'consumable-count' }, state.potions.mana), html.span({ class: 'key-hint' }, '[2]'))
                )
                : null,
            state.classId === 'ranger'
                ? html.div({ class: 'consumable' },
                    html.span({ class: 'consumable-icon' }, '🏹'),
                    html.div(html.span({ class: 'consumable-count' }, state.ammo), html.span({ class: 'key-hint' }, 'Arrows'))
                )
                : null
        ),
        html.div({ class: 'equipment-section' },
            html.div({ class: 'section-title' }, 'Equipment'),
            html.div({ class: 'equipment-grid' },
                html.div({ class: `equipment-slot ${state.equipment.head ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.head ? '🪖' : '○'), 'Head'),
                html.div({ class: `equipment-slot ${state.equipment.mainhand ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.mainhand ? '⚔️' : '○'), 'Weapon'),
                html.div({ class: `equipment-slot ${state.equipment.offhand ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.offhand ? '🛡️' : '○'), 'Offhand'),
                html.div({ class: `equipment-slot ${state.equipment.chest ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.chest ? '👕' : '○'), 'Chest'),
                html.div({ class: `equipment-slot ${state.equipment.hands ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.hands ? '🧤' : '○'), 'Hands'),
                html.div({ class: `equipment-slot ${state.equipment.feet ? 'filled' : ''}` }, html.span({ class: 'slot-icon' }, state.equipment.feet ? '👢' : '○'), 'Feet')
            )
        ),
        html.div({ class: 'inventory-grid' },
            ...Array(20).fill(0).map((_, i) => {
                const item = state.inventory[i];
                return html.div({ 
                    class: `inventory-slot ${item ? 'filled' : ''}`,
                    click: () => { if (item) window.postMessage({ type: 'equip-item', index: i }, '*'); }
                }, item ? html.span({ class: 'item-icon' }, getItemIcon(item)) : '');
            })
        )
    )
]);

// Action Bar
pfusch("action-bar", { primaryCooldown: 0, secondaryCooldown: 0, primaryName: 'Attack', secondaryName: 'Special' }, (state) => [
    css`
        :host { display: block; }
        .bar {
            display: flex;
            gap: 10px;
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.85));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 10px 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        }
        .action-btn {
            width: 60px;
            height: 60px;
            background: linear-gradient(180deg, #4A0000, #2a0000);
            border: 2px solid #8B0000;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: pointer;
            transition: all 0.2s;
        }
        .action-btn:hover { border-color: #D4AF37; transform: scale(1.05); }
        .action-btn.on-cooldown { opacity: 0.6; }
        .action-icon { font-size: 1.5rem; }
        .action-key { position: absolute; bottom: 2px; right: 4px; font-size: 0.65rem; color: #A0A0A0; font-family: 'Crimson Text', serif; }
        .cooldown-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0, 0, 0, 0.7); transition: height 0.1s; }
        .teleport-hint { font-family: 'Crimson Text', serif; font-size: 0.8rem; color: #A0A0A0; display: flex; align-items: center; gap: 5px; padding: 0 15px; }
    `,
    script(function() {
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'game-state-update') {
                const data = JSON.parse(e.data.detail.data);
                if (data.player) {
                    this.component.state.primaryCooldown = data.player.primaryCooldown || 0;
                    this.component.state.secondaryCooldown = data.player.secondaryCooldown || 0;
                    this.component.state.primaryName = data.player.class?.primaryAttack?.name || 'Attack';
                    this.component.state.secondaryName = data.player.class?.secondaryAttack?.name || 'Special';
                }
            }
        });
    }),
    html.div({ class: 'bar' },
        html.div({ class: `action-btn ${state.primaryCooldown > 0 ? 'on-cooldown' : ''}`, title: state.primaryName },
            html.span({ class: 'action-icon' }, '⚔️'),
            html.span({ class: 'action-key' }, 'LMB'),
            state.primaryCooldown > 0 ? html.div({ class: 'cooldown-overlay', style: `height: ${Math.min(100, state.primaryCooldown / 10)}%` }) : null
        ),
        html.div({ class: `action-btn ${state.secondaryCooldown > 0 ? 'on-cooldown' : ''}`, title: state.secondaryName },
            html.span({ class: 'action-icon' }, '✨'),
            html.span({ class: 'action-key' }, 'RMB'),
            state.secondaryCooldown > 0 ? html.div({ class: 'cooldown-overlay', style: `height: ${Math.min(100, state.secondaryCooldown / 30)}%` }) : null
        ),
        html.div({ class: 'teleport-hint' }, html.span('[T] Teleport to Town'))
    )
]);

// Minimap Panel
pfusch("minimap-panel", {
    tiles: [], playerX: 0, playerY: 0, creeps: [], mapWidth: 50, mapHeight: 50, location: 'town'
}, (state) => [
    css`
        :host { display: block; }
        .panel {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.85));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        }
        .title { font-family: 'Cinzel', serif; font-size: 0.9rem; color: #D4AF37; text-align: center; margin-bottom: 8px; }
        .map-container { width: 150px; height: 150px; background: #0a0505; border: 1px solid #4A0000; position: relative; overflow: hidden; }
        .map-canvas { width: 100%; height: 100%; }
        .location-label { font-family: 'Crimson Text', serif; font-size: 0.8rem; color: #F5E6C8; text-align: center; margin-top: 5px; }
    `,
    script(function() {
        const canvas = this.shadowRoot.querySelector('.map-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 150;
        canvas.height = 150;
        const drawMinimap = () => {
            const s = this.component.state;
            ctx.fillStyle = '#0a0505';
            ctx.fillRect(0, 0, 150, 150);
            if (!s.tiles || s.tiles.length === 0) return;
            const scale = 150 / Math.max(s.mapWidth, s.mapHeight);
            for (let y = 0; y < s.tiles.length; y++) {
                for (let x = 0; x < (s.tiles[y]?.length || 0); x++) {
                    const tile = s.tiles[y][x];
                    if (tile?.walkable) {
                        ctx.fillStyle = s.location === 'town' ? '#228B22' : '#2a1515';
                        ctx.fillRect(x * scale, y * scale, scale + 1, scale + 1);
                    }
                }
            }
            ctx.fillStyle = '#FF0000';
            for (const creep of s.creeps) {
                if (creep.health > 0) {
                    const size = creep.isBoss ? 4 : 2;
                    ctx.fillRect(creep.position.x * scale - size/2, creep.position.y * scale - size/2, size, size);
                }
            }
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(s.playerX * scale, s.playerY * scale, 4, 0, Math.PI * 2);
            ctx.fill();
        };
        drawMinimap();
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'game-state-update') {
                const data = JSON.parse(e.data.detail.data);
                if (data.player) {
                    this.component.state.playerX = data.player.position.x;
                    this.component.state.playerY = data.player.position.y;
                }
                if (data.currentLocation) {
                    this.component.state.location = data.currentLocation;
                    const loc = data.currentLocation === 'town' ? data.town : data.dungeon;
                    if (loc) {
                        this.component.state.tiles = loc.tiles;
                        this.component.state.mapWidth = loc.width;
                        this.component.state.mapHeight = loc.height;
                    }
                }
                if (data.creeps) this.component.state.creeps = data.creeps;
                drawMinimap();
            }
        });
    }),
    html.div({ class: 'panel' },
        html.div({ class: 'title' }, '🗺️ Map'),
        html.div({ class: 'map-container' }, html.canvas({ class: 'map-canvas' })),
        html.div({ class: 'location-label' }, state.location === 'town' ? '🏘️ Town' : '⚔️ Dungeon')
    )
]);

// Shop Dialog
pfusch("shop-dialog", {
    open: false, shopId: null, shopName: '', items: [], playerGold: 0, playerPower: 0
}, (state, trigger) => [
    css`
        .container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: ${state.open ? 'flex' : 'none'};
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.8);
            z-index: 500;
        }
        .backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        .dialog {
            background: linear-gradient(135deg, #1a1010 0%, #2a1515 50%, #1a0a0a 100%);
            border: 3px solid #D4AF37;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            z-index: 1;
        }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); }
        h2 { font-family: 'Cinzel', serif; color: #D4AF37; margin: 0; }
        .gold-display { font-family: 'MedievalSharp', cursive; color: #FFD700; font-size: 1.2rem; margin-left: auto; margin-right: 20px; }
        .close-btn { 
            background: linear-gradient(180deg, #8B0000, #4A0000);
            border: 2px solid #D4AF37;
            color: #F5E6C8;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 8px 15px;
            border-radius: 4px;
            font-family: 'Cinzel', serif;
            transition: all 0.2s;
        }
        .close-btn:hover { 
            background: linear-gradient(180deg, #FF3030, #8B0000);
            box-shadow: 0 0 15px rgba(255, 48, 48, 0.5);
        }
        .items-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .item-card { background: rgba(0, 0, 0, 0.4); border: 2px solid #4A0000; border-radius: 8px; padding: 15px; transition: all 0.2s; }
        .item-card:hover { border-color: #D4AF37; }
        .item-card.locked { opacity: 0.6; }
        .item-name { font-family: 'Cinzel', serif; font-size: 1rem; margin-bottom: 5px; }
        .quality-common { color: #FFFFFF; }
        .quality-uncommon { color: #1EFF00; }
        .quality-rare { color: #0070DD; }
        .quality-epic { color: #A335EE; }
        .quality-legendary { color: #FF8000; }
        .item-stats { font-family: 'Crimson Text', serif; font-size: 0.85rem; color: #A0A0A0; margin: 8px 0; }
        .stat-bonus { color: #48bb78; }
        .item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .item-price { color: #FFD700; font-family: 'MedievalSharp', cursive; }
        .buy-btn {
            background: linear-gradient(180deg, #48bb78, #2f855a);
            border: 1px solid #68d391;
            border-radius: 4px;
            color: white;
            padding: 6px 15px;
            font-family: 'Cinzel', serif;
            font-size: 0.85rem;
            cursor: pointer;
        }
        .buy-btn:hover:not(:disabled) { background: linear-gradient(180deg, #68d391, #48bb78); }
        .buy-btn:disabled { background: #4A4A4A; border-color: #666; cursor: not-allowed; }
        .locked-msg { font-size: 0.75rem; color: #ef4444; font-style: italic; }
        .empty-shop { text-align: center; color: #A0A0A0; font-style: italic; padding: 40px; }
    `,
    script(function() {
        window.addEventListener('open-shop', (e) => {
            this.component.state.open = true;
            this.component.state.shopId = e.detail.shopId;
            this.component.state.shopName = e.detail.shopName;
            this.component.state.items = e.detail.items || [];
            this.component.state.playerGold = e.detail.playerGold || 0;
            this.component.state.playerPower = e.detail.playerPower || 0;
        });
        window.addEventListener('close-shop', () => {
            this.component.state.open = false;
        });
        window.addEventListener('message', (e) => {
            if (e.data?.eventName === 'shop-update') {
                const data = JSON.parse(e.data.detail.data);
                this.component.state.items = data.items || [];
                this.component.state.playerGold = data.playerGold || 0;
            }
        });
        // Close on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.component.state.open) {
                this.component.state.open = false;
            }
        });
    }),
    state.open ? html.div({ class: 'container' },
    html.div({ class: 'backdrop', click: () => { state.open = false; } }),
    html.div({ class: 'dialog' },
        html.div({ class: 'header' },
            html.h2(state.shopName || 'Shop'),
            html.div({ class: 'gold-display' }, `🪙 ${state.playerGold}`),
            html.button({ class: 'close-btn', click: (e) => { e.stopPropagation(); state.open = false; } }, '✕ Close')
        ),
        state.items.length === 0 
            ? html.div({ class: 'empty-shop' }, 'This shop is empty. Come back later!')
            : html.div({ class: 'items-grid' },
            ...state.items.map((item, index) => {
                const canAfford = state.playerGold >= item.price;
                const hasRequiredPower = state.playerPower >= (item.requiresPower || 0);
                const canBuy = canAfford && hasRequiredPower;
                return html.div({ class: `item-card ${!hasRequiredPower ? 'locked' : ''}` },
                    html.div({ class: `item-name quality-${item.quality?.id || 'common'}` }, item.name),
                    html.div({ class: 'item-stats' },
                        item.damage ? html.div(`Damage: ${item.damage}`) : null,
                        item.armor ? html.div(`Armor: ${item.armor}`) : null,
                        item.effect ? html.div(`Restores: ${item.effect}`) : null,
                        item.quantity ? html.div(`Quantity: ${item.quantity}`) : null,
                        item.statBonuses ? html.div({ class: 'stat-bonus' },
                            Object.entries(item.statBonuses).map(([stat, val]) => `+${val} ${stat.slice(0,3).toUpperCase()}`).join(' ')
                        ) : null
                    ),
                    !hasRequiredPower ? html.div({ class: 'locked-msg' }, 'Requires more power') : null,
                    html.div({ class: 'item-footer' },
                        html.span({ class: 'item-price' }, `🪙 ${item.price}`),
                        html.button({
                            class: 'buy-btn',
                            disabled: !canBuy,
                            click: () => window.postMessage({ type: 'buy-item', shopId: state.shopId, itemIndex: index }, '*')
                        }, canBuy ? 'Buy' : (canAfford ? 'Locked' : 'Need Gold'))
                    )
                );
            })
        )
    )
) : ""
]);

// Game Toast Notifications
pfusch("game-toast", { messages: [], nextId: 0 }, (state) => [
    css`
        :host { position: fixed; top: 100px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; }
        .toast {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(74, 0, 0, 0.9));
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 15px 25px;
            margin-bottom: 10px;
            font-family: 'Crimson Text', serif;
            color: #F5E6C8;
            text-align: center;
            animation: fadeInOut 3s ease-in-out;
            box-shadow: 0 0 20px rgba(139, 0, 0, 0.5);
        }
        .toast.success { border-color: #48bb78; }
        .toast.error { border-color: #ef4444; }
        .toast.info { border-color: #0080FF; }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `,
    script(function() {
        window.addEventListener('game-toast', (e) => {
            const id = this.component.state.nextId++;
            this.component.state.messages = [...this.component.state.messages, { id, text: e.detail.text, type: e.detail.type || 'info' }];
            setTimeout(() => {
                this.component.state.messages = this.component.state.messages.filter(m => m.id !== id);
            }, 3000);
        });
    }),
    ...state.messages.map(msg => html.div({ class: `toast ${msg.type}` }, msg.text))
]);

function getItemIcon(item) {
    if (!item) return '';
    const icons = { sword: '⚔️', axe: '🪓', mace: '🔨', shield: '🛡️', staff: '🪄', wand: '✨', orb: '🔮', bow: '🏹', crossbow: '🎯', head: '🪖', chest: '👕', legs: '👖', feet: '👢', hands: '🧤', health: '🧪', mana: '💧' };
    return icons[item.type] || icons[item.slot] || '📦';
}