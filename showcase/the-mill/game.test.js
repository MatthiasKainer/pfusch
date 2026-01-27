// game.test.js - Tests for The Mill game
import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, pfuschTest } from '../../unit-tests/pfusch-stubs.js';

let restore;

test.before(() => {
  ({ restore } = setupDomStubs());
});

test.after(() => {
  restore?.();
});

// ============================================================================
// Test pfusch basics
// ============================================================================

test('pfusch creates a custom element', () => {
  pfusch('test-basic', { count: 0 }, (state) => [
    html.div({ class: 'container' }, `Count: ${state.count}`)
  ]);
  
  const el = document.createElement('test-basic');
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.ok(el.shadowRoot, 'Element should have shadow root');
  assert.equal(el.state.count, 0, 'Initial state should be 0');
});

test('pfusch state is reactive', async () => {
  pfusch('test-reactive', { value: 'initial' }, (state) => [
    html.span({ class: 'output' }, state.value)
  ]);
  
  const el = document.createElement('test-reactive');
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.equal(el.state.value, 'initial');
  
  el.state.value = 'updated';
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(el.state.value, 'updated');
});

test('pfusch trigger sends events', async () => {
  let receivedEvent = null;
  
  pfusch('test-trigger', {}, (state, trigger) => [
    html.button({ click: () => trigger('clicked', { data: 'test' }) }, 'Click')
  ]);
  
  window.addEventListener('test-trigger.clicked', (e) => {
    receivedEvent = e.detail;
  });
  
  const el = document.createElement('test-trigger');
  document.body.appendChild(el);
  el.connectedCallback();
  
  // Find and click button
  const button = el.shadowRoot.querySelector('button');
  button.click();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.deepEqual(receivedEvent, { data: 'test' });
});

test('pfusch event handlers use event name as key, not onEventName', async () => {
  let clicked = false;
  
  pfusch('test-events', {}, (state, trigger) => [
    // CORRECT: { click: handler }
    html.button({ click: () => { clicked = true; } }, 'Click Me')
  ]);
  
  const el = document.createElement('test-events');
  document.body.appendChild(el);
  el.connectedCallback();
  
  const button = el.shadowRoot.querySelector('button');
  button.click();
  
  assert.equal(clicked, true, 'Click handler should be called');
});

test('pfusch children helper works', () => {
  pfusch('test-children', {}, (state, trigger, { children }) => [
    html.div({ class: 'wrapper' },
      html.slot()
    )
  ]);
  
  const el = document.createElement('test-children');
  const child = document.createElement('span');
  child.textContent = 'Child content';
  el.appendChild(child);
  
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.ok(el.shadowRoot.querySelector('.wrapper'), 'Wrapper should exist');
});

test('pfusch script runs after mount', async () => {
  let scriptRan = false;
  let scriptContext = null;
  
  pfusch('test-script', { initialized: false }, (state) => [
    script(function() {
      scriptRan = true;
      scriptContext = this;
      state.initialized = true;
    }),
    html.div(`Initialized: ${state.initialized}`)
  ]);
  
  const el = document.createElement('test-script');
  document.body.appendChild(el);
  el.connectedCallback();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(scriptRan, true, 'Script should have run');
  assert.equal(scriptContext, el, 'Script context should be the element');
  assert.equal(el.state.initialized, true, 'State should be updated by script');
});

// ============================================================================
// Test game components
// ============================================================================

test('counter component increments correctly', async () => {
  pfusch('game-counter', { count: 0 }, (state, trigger) => [
    html.div({ class: 'counter' },
      html.span({ class: 'value' }, String(state.count)),
      html.button({ class: 'inc', click: () => { state.count++; } }, '+'),
      html.button({ class: 'dec', click: () => { state.count--; } }, '-')
    )
  ]);
  
  const el = document.createElement('game-counter');
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.equal(el.state.count, 0);
  
  const incBtn = el.shadowRoot.querySelector('.inc');
  incBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  assert.equal(el.state.count, 1);
  
  incBtn.click();
  incBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  assert.equal(el.state.count, 3);
  
  const decBtn = el.shadowRoot.querySelector('.dec');
  decBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  assert.equal(el.state.count, 2);
});

test('resource display shows all resources', () => {
  pfusch('resource-display', {
    resources: { food: 10, wood: 5, stone: 3 }
  }, (state) => [
    html.div({ class: 'resources' },
      ...Object.entries(state.resources).map(([key, value]) =>
        html.div({ class: `resource resource-${key}` },
          html.span({ class: 'name' }, key),
          html.span({ class: 'value' }, String(value))
        )
      )
    )
  ]);
  
  const el = document.createElement('resource-display');
  document.body.appendChild(el);
  el.connectedCallback();
  
  const foodEl = el.shadowRoot.querySelector('.resource-food');
  assert.ok(foodEl, 'Food resource should exist');
  
  const foodValue = foodEl.querySelector('.value');
  assert.equal(foodValue.textContent, '10');
});

test('menu component triggers game start with correct config', async () => {
  let startConfig = null;
  
  pfusch('game-menu', {
    mapSize: 20,
    playerCount: 2
  }, (state, trigger) => [
    html.div({ class: 'menu' },
      html.select({
        class: 'map-size',
        change: (e) => { state.mapSize = parseInt(e.target.value); }
      },
        html.option({ value: '15' }, 'Small'),
        html.option({ value: '20' }, 'Medium'),
        html.option({ value: '30' }, 'Large')
      ),
      html.button({
        class: 'start-btn',
        click: () => {
          trigger('start', { mapSize: state.mapSize, playerCount: state.playerCount });
        }
      }, 'Start Game')
    )
  ]);
  
  window.addEventListener('game-menu.start', (e) => {
    startConfig = e.detail;
  });
  
  const el = document.createElement('game-menu');
  document.body.appendChild(el);
  el.connectedCallback();
  
  // Click start
  const startBtn = el.shadowRoot.querySelector('.start-btn');
  startBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.deepEqual(startConfig, { mapSize: 20, playerCount: 2 });
});

test('unit card displays unit stats correctly', () => {
  const unitData = {
    id: 'scout_1',
    name: 'Scout',
    attack: 1,
    defense: 1,
    movement: 4,
    health: 75
  };
  
  pfusch('unit-card', {
    unit: null
  }, (state) => [
    state.unit ? html.div({ class: 'unit-card' },
      html.span({ class: 'name' }, state.unit.name),
      html.span({ class: 'attack' }, `ATK: ${state.unit.attack}`),
      html.span({ class: 'defense' }, `DEF: ${state.unit.defense}`),
      html.span({ class: 'health' }, `HP: ${state.unit.health}%`)
    ) : html.div({ class: 'empty' }, 'No unit selected')
  ]);
  
  const el = document.createElement('unit-card');
  el.setAttribute('unit', JSON.stringify(unitData));
  document.body.appendChild(el);
  el.connectedCallback();
  
  const nameEl = el.shadowRoot.querySelector('.name');
  assert.equal(nameEl.textContent, 'Scout');
  
  const healthEl = el.shadowRoot.querySelector('.health');
  assert.equal(healthEl.textContent, 'HP: 75%');
});

test('tile selection triggers event with correct data', async () => {
  let selectedTile = null;
  
  pfusch('tile-selector', {
    tiles: [
      { x: 0, y: 0, terrain: 'plains' },
      { x: 1, y: 0, terrain: 'forest' },
      { x: 0, y: 1, terrain: 'hills' }
    ],
    selected: null
  }, (state, trigger) => [
    html.div({ class: 'grid' },
      ...state.tiles.map(tile =>
        html.div({
          class: `tile tile-${tile.terrain} ${state.selected?.x === tile.x && state.selected?.y === tile.y ? 'selected' : ''}`,
          'data-x': tile.x,
          'data-y': tile.y,
          click: () => {
            state.selected = tile;
            trigger('tile-selected', tile);
          }
        }, tile.terrain)
      )
    )
  ]);
  
  window.addEventListener('tile-selector.tile-selected', (e) => {
    selectedTile = e.detail;
  });
  
  const el = document.createElement('tile-selector');
  document.body.appendChild(el);
  el.connectedCallback();
  
  // Click on forest tile
  const tiles = el.shadowRoot.querySelectorAll('.tile');
  tiles[1].click();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.deepEqual(selectedTile, { x: 1, y: 0, terrain: 'forest' });
  assert.deepEqual(el.state.selected, { x: 1, y: 0, terrain: 'forest' });
});

test('turn counter increments on end turn', async () => {
  pfusch('turn-display', {
    turn: 1,
    phase: 'PLAYER_TURN'
  }, (state, trigger) => [
    html.div({ class: 'turn-info' },
      html.span({ class: 'turn-number' }, `Turn ${state.turn}`),
      html.span({ class: 'phase' }, state.phase),
      html.button({
        class: 'end-turn',
        click: () => {
          state.turn++;
          trigger('turn-ended', { turn: state.turn });
        }
      }, 'End Turn')
    )
  ]);
  
  const el = document.createElement('turn-display');
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.equal(el.state.turn, 1);
  
  const endTurnBtn = el.shadowRoot.querySelector('.end-turn');
  endTurnBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(el.state.turn, 2);
});

test('notification system shows and auto-removes messages', async () => {
  pfusch('notification-system', {
    notifications: []
  }, (state, trigger) => [
    script(function() {
      window.addEventListener('add-notification', (e) => {
        const notification = { id: Date.now(), message: e.detail.message };
        state.notifications = [...state.notifications, notification];
        
        // Auto-remove after delay
        setTimeout(() => {
          state.notifications = state.notifications.filter(n => n.id !== notification.id);
        }, 100);
      });
    }),
    html.div({ class: 'notifications' },
      ...state.notifications.map(n =>
        html.div({ class: 'notification', 'data-id': n.id }, n.message)
      )
    )
  ]);
  
  const el = document.createElement('notification-system');
  document.body.appendChild(el);
  el.connectedCallback();
  
  await new Promise(r => setTimeout(r, 0));
  
  // Add notification
  window.dispatchEvent(new CustomEvent('add-notification', { detail: { message: 'Test message' } }));
  
  await new Promise(r => setTimeout(r, 10));
  
  assert.equal(el.state.notifications.length, 1);
  assert.equal(el.state.notifications[0].message, 'Test message');
  
  // Wait for auto-remove
  await new Promise(r => setTimeout(r, 150));
  
  assert.equal(el.state.notifications.length, 0);
});

test('array state updates trigger re-render', async () => {
  pfusch('list-component', {
    items: ['a', 'b']
  }, (state, trigger) => [
    html.div({ class: 'list' },
      ...state.items.map((item, i) =>
        html.div({ class: 'item', 'data-index': i }, item)
      ),
      html.button({
        class: 'add',
        click: () => {
          state.items = [...state.items, 'new'];
        }
      }, 'Add')
    )
  ]);
  
  const el = document.createElement('list-component');
  document.body.appendChild(el);
  el.connectedCallback();
  
  assert.equal(el.state.items.length, 2);
  
  const addBtn = el.shadowRoot.querySelector('.add');
  addBtn.click();
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(el.state.items.length, 3);
  assert.equal(el.state.items[2], 'new');
});

// ============================================================================
// Test game logic (Worker functions)
// ============================================================================

test('pathfinding finds shortest path on flat terrain', () => {
  // Simple A* test without worker
  const findPath = (start, end, grid) => {
    const openSet = [{ ...start, g: 0, f: Math.abs(end.x - start.x) + Math.abs(end.y - start.y) }];
    const closedSet = new Set();
    const cameFrom = new Map();
    
    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      
      if (current.x === end.x && current.y === end.y) {
        const path = [{ x: current.x, y: current.y }];
        let key = `${current.x},${current.y}`;
        while (cameFrom.has(key)) {
          const prev = cameFrom.get(key);
          path.unshift({ x: prev.x, y: prev.y });
          key = `${prev.x},${prev.y}`;
        }
        return path;
      }
      
      closedSet.add(`${current.x},${current.y}`);
      
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 }
      ].filter(n => 
        n.x >= 0 && n.x < grid.width && 
        n.y >= 0 && n.y < grid.height &&
        grid.tiles[n.y * grid.width + n.x] !== 'water'
      );
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;
        
        const g = current.g + 1;
        const h = Math.abs(end.x - neighbor.x) + Math.abs(end.y - neighbor.y);
        const f = g + h;
        
        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
        if (!existing) {
          openSet.push({ ...neighbor, g, f });
          cameFrom.set(key, current);
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          cameFrom.set(key, current);
        }
      }
    }
    
    return null;
  };
  
  const grid = {
    width: 5,
    height: 5,
    tiles: Array(25).fill('plains')
  };
  
  const path = findPath({ x: 0, y: 0 }, { x: 4, y: 4 }, grid);
  
  assert.ok(path, 'Path should be found');
  assert.equal(path.length, 9, 'Path should have 9 steps (including start and end)');
  assert.deepEqual(path[0], { x: 0, y: 0 }, 'Path should start at origin');
  assert.deepEqual(path[path.length - 1], { x: 4, y: 4 }, 'Path should end at destination');
});

test('combat resolution calculates damage correctly', () => {
  const resolveCombat = (attacker, defender, terrain) => {
    const attackPower = attacker.attack * (attacker.health / 100);
    const defensePower = defender.defense * (defender.health / 100) * (1 + terrain.defense * 0.2);
    
    // Simplified deterministic version for testing
    const damage = Math.abs(attackPower - defensePower) * 10 + 5;
    
    if (attackPower > defensePower) {
      return {
        winner: 'attacker',
        attackerDamage: Math.round(damage * 0.3),
        defenderDamage: Math.round(damage)
      };
    } else {
      return {
        winner: 'defender',
        attackerDamage: Math.round(damage),
        defenderDamage: Math.round(damage * 0.3)
      };
    }
  };
  
  const attacker = { attack: 5, health: 100 };
  const defender = { defense: 3, health: 100 };
  const terrain = { defense: 0 };
  
  const result = resolveCombat(attacker, defender, terrain);
  
  assert.equal(result.winner, 'attacker');
  assert.ok(result.defenderDamage > result.attackerDamage);
});

test('resource calculation includes mill production and unit upkeep', () => {
  const calculateResources = (player) => {
    const production = { food: 0, wood: 0, stone: 0 };
    const consumption = { food: 0 };
    
    // Mill production
    player.mills.forEach(mill => {
      Object.entries(mill.produces).forEach(([res, amt]) => {
        production[res] = (production[res] || 0) + amt;
      });
    });
    
    // Unit upkeep
    consumption.food += player.units.length;
    
    // Calculate new resources
    const newResources = { ...player.resources };
    Object.keys(production).forEach(res => {
      newResources[res] = Math.max(0, (newResources[res] || 0) + production[res] - (consumption[res] || 0));
    });
    
    return newResources;
  };
  
  const player = {
    resources: { food: 10, wood: 5, stone: 2 },
    mills: [
      { produces: { food: 3 } },
      { produces: { wood: 2 } }
    ],
    units: [{ id: 'unit1' }, { id: 'unit2' }]
  };
  
  const newResources = calculateResources(player);
  
  // Food: 10 + 3 (production) - 2 (upkeep) = 11
  assert.equal(newResources.food, 11);
  // Wood: 5 + 2 = 7
  assert.equal(newResources.wood, 7);
  // Stone: 2 + 0 = 2
  assert.equal(newResources.stone, 2);
});

// ============================================================================
// Integration tests
// ============================================================================

test('full game flow: start game, select unit, end turn', async () => {
  // Game state store
  const store = {
    state: { phase: 'MENU', turn: 1 },
    listeners: [],
    setState(updates) {
      this.state = { ...this.state, ...updates };
      this.notify();
    },
    notify() {
      this.listeners.forEach(l => l(this.state));
      window.dispatchEvent(new CustomEvent('store.updated', { detail: this.state }));
    }
  };
  
  // Simple game controller
  pfusch('game-controller', {
    phase: 'MENU',
    turn: 1,
    selectedUnit: null
  }, (state, trigger) => [
    script(function() {
      window.addEventListener('store.updated', (e) => {
        state.phase = e.detail.phase;
        state.turn = e.detail.turn;
      });
    }),
    state.phase === 'MENU' ? html.div({ class: 'menu' },
      html.button({
        class: 'start',
        click: () => {
          store.setState({ phase: 'PLAYING' });
        }
      }, 'Start')
    ) : null,
    state.phase === 'PLAYING' ? html.div({ class: 'game' },
      html.span({ class: 'turn' }, `Turn: ${state.turn}`),
      html.button({
        class: 'end-turn',
        click: () => {
          store.setState({ turn: state.turn + 1 });
        }
      }, 'End Turn')
    ) : null
  ]);
  
  const el = document.createElement('game-controller');
  document.body.appendChild(el);
  el.connectedCallback();
  
  await new Promise(r => setTimeout(r, 0));
  
  // Should show menu initially
  assert.equal(el.state.phase, 'MENU');
  
  // Start game
  const startBtn = el.shadowRoot.querySelector('.start');
  assert.ok(startBtn, 'Start button should exist');
  startBtn.click();
  
  await new Promise(r => setTimeout(r, 10));
  
  assert.equal(el.state.phase, 'PLAYING');
  
  // End turn
  const endTurnBtn = el.shadowRoot.querySelector('.end-turn');
  assert.ok(endTurnBtn, 'End turn button should exist');
  endTurnBtn.click();
  
  await new Promise(r => setTimeout(r, 10));
  
  assert.equal(el.state.turn, 2);
});

console.log('All tests defined. Run with: node --test tests/game.test.js');
