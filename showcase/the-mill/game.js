// game.js - The Mill - Medieval Strategy Game
import { pfusch, html, css, script } from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const TERRAIN_COLORS = {
  plains: '#8fbc8f', forest: '#228b22', hills: '#a0522d',
  mountains: '#696969', water: '#4682b4', marsh: '#6b8e23'
};

const TERRAIN_ICONS = {
  plains: '🌾', forest: '🌲', hills: '⛰️',
  mountains: '🏔️', water: '🌊', marsh: '🌿'
};

const MILL_ICONS = {
  castle_mill: '🏰', grain_mill: '🌾', forge: '⚒️',
  cloth_mill: '🧵', lumber_mill: '🪵', stone_quarry: '🪨', mine: '⛏️'
};

const UNIT_ICONS = {
  scout: '🏃', militia: '⚔️', infantry: '🗡️',
  heavy_infantry: '🛡️', cavalry: '🐴'
};

const RESOURCE_ICONS = {
  gold: '🪙', food: '🍞', wood: '🪵', stone: '🪨',
  ore: '⛏️', weapons: '⚔️', clothing: '👕', tools: '🔧'
};

// Unit upkeep costs in gold per turn
const UNIT_UPKEEP = {
  scout: 1,
  militia: 2,
  infantry: 3,
  heavy_infantry: 4,
  cavalry: 4
};

const PLAYER_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];

// ============================================================================
// WORKER BRIDGE
// ============================================================================

class GameWorkerBridge {
  constructor() {
    this.worker = new Worker('game-worker.js');
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    this.worker.onmessage = (e) => {
      const { type, payload, requestId } = e.data;
      console.log('[Worker] Message received:', type, requestId);
      
      if (this.pendingRequests.has(requestId)) {
        const { resolve, reject } = this.pendingRequests.get(requestId);
        this.pendingRequests.delete(requestId);
        if (type === 'ERROR') reject(new Error(payload.message));
        else resolve(payload);
      }
    };
    
    this.worker.onerror = (e) => {
      console.error('[Worker] Error:', e);
    };
  }
  
  send(type, payload) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve, reject });
      console.log('[Worker] Sending:', type, requestId);
      this.worker.postMessage({ type, payload, requestId });
    });
  }
  
  initGame(config) { return this.send('INIT_GAME', config); }
  processTurn(gameState) { return this.send('PROCESS_TURN', { gameState }); }
  getValidMoves(unitId, playerId, gameState) { return this.send('GET_VALID_MOVES', { unitId, playerId, gameState }); }
}

const gameWorker = new GameWorkerBridge();

// ============================================================================
// GAME STORE
// ============================================================================

class GameStore {
  constructor() {
    this.state = {
      phase: 'MENU',
      gameState: null,
      notifications: []
    };
  }
  
  getState() { return this.state; }
  
  setState(updates) {
    console.log('[Store] setState:', Object.keys(updates));
    this.state = { ...this.state, ...updates };
    window.dispatchEvent(new CustomEvent('game-store.updated', { detail: this.state }));
  }
  
  addNotification(message, type = 'info') {
    const id = Date.now();
    this.state.notifications = [...this.state.notifications, { id, message, type }];
    window.dispatchEvent(new CustomEvent('game-store.updated', { detail: this.state }));
    setTimeout(() => {
      this.state.notifications = this.state.notifications.filter(n => n.id !== id);
      window.dispatchEvent(new CustomEvent('game-store.updated', { detail: this.state }));
    }, 4000);
  }
}

const gameStore = new GameStore();
window.gameStore = gameStore;
window.gameWorker = gameWorker;

// ============================================================================
// GAME APP
// ============================================================================

pfusch("game-app", { phase: 'MENU', loading: false }, (state, trigger) => [
  css`
    :host { display: block; width: 100vw; height: 100vh; overflow: hidden; background: #1a1a2e; }
    .loading { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .spinner { width: 50px; height: 50px; border: 4px solid #333; border-top-color: #c9a227; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
  script(function() {
    console.log('[game-app] Script init');
    
    window.addEventListener('game-store.updated', (e) => {
      console.log('[game-app] Store updated, phase:', e.detail.phase);
      this.state.phase = e.detail.phase;
      this.state.loading = false;
    });
    
    window.addEventListener('game.start', async (e) => {
      console.log('[game-app] Starting game:', e.detail);
      this.state.loading = true;
      
      try {
        const gs = await gameWorker.initGame({
          mapSize: e.detail.mapSize,
          players: e.detail.players,
          difficulty: e.detail.difficulty
        });
        
        console.log('[game-app] Got game state:', {
          map: gs.map?.width + 'x' + gs.map?.height,
          players: gs.players?.length,
          currentPlayer: gs.currentPlayer,
          turn: gs.turn
        });
        
        // Log player details
        gs.players.forEach((p, i) => {
          console.log(`[game-app] Player ${i}: ${p.name}, units: ${p.units?.length}, explored: ${p.explored?.length}`);
          p.units?.forEach(u => console.log(`  - Unit: ${u.type.name} at (${u.position.x}, ${u.position.y})`));
        });
        
        // Convert explored arrays to Sets for efficient lookup
        gs.players = gs.players.map(p => ({
          ...p,
          explored: new Set(p.explored || [])
        }));
        
        gameStore.setState({ phase: 'PLAYING', gameState: gs });
      } catch (err) {
        console.error('[game-app] Failed to start:', err);
        gameStore.addNotification('Failed to start game: ' + err.message, 'error');
        this.state.loading = false;
      }
    });
  }),
  state.phase === 'MENU' ? html['main-menu']() : null,
  state.phase === 'PLAYING' ? html['game-screen']() : null,
  state.phase === 'GAME_OVER' ? html['victory-screen']() : null,
  state.loading ? html.div({ class: 'loading' }, html.div({ class: 'spinner' })) : null,
  html['notification-stack']()
]);

// ============================================================================
// MAIN MENU
// ============================================================================

pfusch("main-menu", { mapSize: 20, playerCount: 2, difficulty: 'normal' }, (state, trigger) => [
  css`
    :host { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    .menu { background: rgba(42, 24, 16, 0.95); border: 3px solid #c9a227; border-radius: 8px; padding: 2rem; max-width: 400px; text-align: center; }
    .title { font-size: 2.5rem; color: #c9a227; margin-bottom: 0.5rem; }
    .subtitle { color: #a09070; margin-bottom: 2rem; }
    .option { margin-bottom: 1rem; text-align: left; }
    .option label { display: block; color: #c9a227; margin-bottom: 0.25rem; font-size: 0.9rem; }
    .option select { width: 100%; padding: 0.5rem; background: #2a1810; border: 1px solid #a09070; color: #f4e4c1; }
    .btn { width: 100%; padding: 1rem; margin-top: 1rem; background: #c9a227; color: #2a1810; border: none; font-size: 1.1rem; cursor: pointer; border-radius: 4px; }
    .btn:hover { background: #ddb530; }
  `,
  html.div({ class: 'menu' },
    html.h1({ class: 'title' }, '⚙️ The Mill'),
    html.p({ class: 'subtitle' }, 'Control the Mills. Command the Kingdom.'),
    html.div({ class: 'option' },
      html.label('Map Size'),
      html.select({ change: (e) => { state.mapSize = parseInt(e.target.value); } },
        html.option({ value: '15' }, 'Small (15×15)'),
        html.option({ value: '20', selected: true }, 'Medium (20×20)'),
        html.option({ value: '30' }, 'Large (30×30)')
      )
    ),
    html.div({ class: 'option' },
      html.label('Opponents'),
      html.select({ change: (e) => { state.playerCount = parseInt(e.target.value); } },
        html.option({ value: '2' }, '1 Opponent'),
        html.option({ value: '3' }, '2 Opponents'),
        html.option({ value: '4' }, '3 Opponents')
      )
    ),
    html.button({ class: 'btn', click: () => {
      console.log('[main-menu] Start clicked');
      const players = [{ id: 'player_1', name: 'You', color: PLAYER_COLORS[0], isAI: false }];
      for (let i = 1; i < state.playerCount; i++) {
        players.push({ id: `player_${i + 1}`, name: `AI ${i}`, color: PLAYER_COLORS[i], isAI: true });
      }
      window.dispatchEvent(new CustomEvent('game.start', {
        detail: { mapSize: state.mapSize, players, difficulty: state.difficulty }
      }));
    }}, '⚔️ Start Game')
  )
]);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

pfusch("notification-stack", { notifications: [] }, (state) => [
  css`
    :host { position: fixed; top: 1rem; right: 1rem; z-index: 2000; }
    .notif { padding: 1rem; margin-bottom: 0.5rem; background: rgba(42, 24, 16, 0.95); border: 2px solid #c9a227; border-radius: 4px; color: #f4e4c1; }
    .notif.error { border-color: #dc2626; }
    .notif.success { border-color: #16a34a; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      this.state.notifications = e.detail.notifications || [];
    });
  }),
  ...state.notifications.map(n => html.div({ class: `notif ${n.type}` }, n.message))
]);

// ============================================================================
// GAME SCREEN
// ============================================================================

pfusch("game-screen", {}, (state, trigger) => [
  css`
    :host { display: grid; grid-template-columns: 240px 1fr 260px; grid-template-rows: auto 1fr auto; width: 100%; height: 100%; }
    .top-bar { grid-column: 1 / -1; background: rgba(42, 24, 16, 0.95); border-bottom: 2px solid #c9a227; padding: 0.5rem 1rem; }
    .left { background: rgba(42, 24, 16, 0.9); border-right: 2px solid #c9a227; overflow-y: auto; display: flex; flex-direction: column; }
    .map { position: relative; overflow: hidden; background: #1a1a2e; }
    .right { background: rgba(42, 24, 16, 0.9); border-left: 2px solid #c9a227; overflow-y: auto; }
    .bottom-bar { grid-column: 1 / -1; background: rgba(42, 24, 16, 0.95); border-top: 2px solid #c9a227; padding: 0.5rem 1rem; }
  `,
  html.div({ class: 'top-bar' }, html['resource-bar']()),
  html.div({ class: 'left' }, 
    html['unit-list'](),
    html['trade-panel']()
  ),
  html.div({ class: 'map' }, html['game-map']()),
  html.div({ class: 'right' }, html['info-panel']()),
  html.div({ class: 'bottom-bar' }, html['action-bar']())
]);

// ============================================================================
// RESOURCE BAR
// ============================================================================

// External trade rates (buy/sell for gold)
const TRADE_RATES = {
  food: { buy: 3, sell: 1 },      // Pay 3 gold to buy 1 food, get 1 gold for selling 1 food
  wood: { buy: 4, sell: 1 },
  stone: { buy: 5, sell: 2 },
  ore: { buy: 6, sell: 2 },
  weapons: { buy: 8, sell: 3 },
  clothing: { buy: 6, sell: 2 },
  tools: { buy: 7, sell: 3 }
};

function calculateResourceDeltas(player, allPlayers) {
  const deltas = {};
  const breakdown = {};
  
  // Initialize
  Object.keys(RESOURCE_ICONS).forEach(res => {
    deltas[res] = 0;
    breakdown[res] = { income: [], expenses: [] };
  });
  
  // Castle produces base gold income
  deltas.gold += 5;
  breakdown.gold.income.push({ source: 'Castle Tax', amount: 5 });
  
  // Castle always produces food
  deltas.food += 3;
  breakdown.food.income.push({ source: 'Castle', amount: 3 });
  
  // Mills production
  (player.mills || []).forEach(mill => {
    if (mill.type?.produces) {
      Object.entries(mill.type.produces).forEach(([res, amt]) => {
        deltas[res] = (deltas[res] || 0) + amt;
        breakdown[res] = breakdown[res] || { income: [], expenses: [] };
        breakdown[res].income.push({ source: mill.type.name, amount: amt });
      });
    }
    if (mill.type?.consumes) {
      Object.entries(mill.type.consumes).forEach(([res, amt]) => {
        deltas[res] = (deltas[res] || 0) - amt;
        breakdown[res] = breakdown[res] || { income: [], expenses: [] };
        breakdown[res].expenses.push({ source: mill.type.name, amount: amt });
      });
    }
  });
  
  // Unit upkeep - food AND gold
  const unitCount = player.units?.length || 0;
  if (unitCount > 0) {
    deltas.food -= unitCount;
    breakdown.food.expenses.push({ source: `${unitCount} units`, amount: unitCount });
  }
  
  // Gold upkeep per unit type
  let totalGoldUpkeep = 0;
  (player.units || []).forEach(unit => {
    const upkeep = UNIT_UPKEEP[unit.type.id] || 1;
    totalGoldUpkeep += upkeep;
  });
  if (totalGoldUpkeep > 0) {
    deltas.gold -= totalGoldUpkeep;
    breakdown.gold.expenses.push({ source: `Army upkeep (${unitCount} units)`, amount: totalGoldUpkeep });
  }
  
  // Trade agreements
  (player.tradeAgreements || []).forEach(agreement => {
    const partner = allPlayers?.find(p => p.id === agreement.partnerId);
    const partnerName = partner?.name || 'Unknown';
    
    // Calculate trade bonus based on agreement duration
    const duration = agreement.duration || 0;
    const bonus = Math.min(0.5, duration * 0.05); // 5% bonus per turn, max 50%
    
    // What we give
    if (agreement.give) {
      deltas[agreement.give.resource] = (deltas[agreement.give.resource] || 0) - agreement.give.amount;
      breakdown[agreement.give.resource] = breakdown[agreement.give.resource] || { income: [], expenses: [] };
      breakdown[agreement.give.resource].expenses.push({ 
        source: `Trade → ${partnerName}`, 
        amount: agreement.give.amount 
      });
    }
    
    // What we receive (with bonus)
    if (agreement.receive) {
      const bonusAmount = Math.floor(agreement.receive.amount * (1 + bonus));
      deltas[agreement.receive.resource] = (deltas[agreement.receive.resource] || 0) + bonusAmount;
      breakdown[agreement.receive.resource] = breakdown[agreement.receive.resource] || { income: [], expenses: [] };
      const bonusText = bonus > 0 ? ` (+${Math.round(bonus*100)}%)` : '';
      breakdown[agreement.receive.resource].income.push({ 
        source: `Trade ← ${partnerName}${bonusText}`, 
        amount: bonusAmount 
      });
    }
  });
  
  // Market orders (recurring buy/sell)
  (player.marketOrders || []).forEach(order => {
    const rate = TRADE_RATES[order.resource]?.[order.type] || 1;
    const goldAmount = rate * order.amount;
    
    if (order.type === 'buy') {
      // Spend gold, gain resource
      deltas.gold = (deltas.gold || 0) - goldAmount;
      deltas[order.resource] = (deltas[order.resource] || 0) + order.amount;
      breakdown.gold.expenses.push({ source: `Market: buy ${order.resource}`, amount: goldAmount });
      breakdown[order.resource] = breakdown[order.resource] || { income: [], expenses: [] };
      breakdown[order.resource].income.push({ source: 'Market order', amount: order.amount });
    } else {
      // Gain gold, spend resource
      deltas.gold = (deltas.gold || 0) + goldAmount;
      deltas[order.resource] = (deltas[order.resource] || 0) - order.amount;
      breakdown.gold.income.push({ source: `Market: sell ${order.resource}`, amount: goldAmount });
      breakdown[order.resource] = breakdown[order.resource] || { income: [], expenses: [] };
      breakdown[order.resource].expenses.push({ source: 'Market order', amount: order.amount });
    }
  });
  
  return { deltas, breakdown };
}

function getActionsRemaining(player) {
  const unitsWithMoves = (player.units || []).filter(u => u.movesLeft > 0).length;
  return { unitsWithMoves };
}

pfusch("resource-bar", { 
  turn: 1, playerName: '', resources: {}, deltas: {}, breakdown: {},
  unitsWithMoves: 0, showBreakdown: null
}, (state) => [
  css`
    :host { display: flex; justify-content: space-between; align-items: center; position: relative; }
    .info { display: flex; gap: 1rem; align-items: center; }
    .turn { background: #c9a227; color: #2a1810; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: bold; }
    .name { color: #f4e4c1; }
    .actions-left { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
    .actions-left.has-actions { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .actions-left.no-actions { background: rgba(100, 100, 100, 0.2); color: #888; }
    .resources { display: flex; gap: 0.75rem; }
    .res { 
      color: #f4e4c1; display: flex; align-items: center; gap: 0.25rem; 
      padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;
      background: rgba(0,0,0,0.2); position: relative;
    }
    .res:hover { background: rgba(201, 162, 39, 0.2); }
    .res-value { font-weight: bold; min-width: 20px; }
    .res-delta { font-size: 0.75rem; margin-left: 0.25rem; }
    .res-delta.positive { color: #22c55e; }
    .res-delta.negative { color: #ef4444; }
    .res-delta.neutral { color: #888; }
    .breakdown {
      position: absolute; top: 100%; right: 0; margin-top: 0.5rem;
      background: rgba(42, 24, 16, 0.98); border: 2px solid #c9a227; border-radius: 4px;
      padding: 0.75rem; min-width: 200px; z-index: 100; font-size: 0.85rem;
    }
    .breakdown-title { color: #c9a227; font-weight: bold; margin-bottom: 0.5rem; border-bottom: 1px solid #a09070; padding-bottom: 0.25rem; }
    .breakdown-section { margin-bottom: 0.5rem; }
    .breakdown-section-title { color: #a09070; font-size: 0.75rem; margin-bottom: 0.25rem; }
    .breakdown-item { display: flex; justify-content: space-between; padding: 0.1rem 0; }
    .breakdown-income { color: #22c55e; }
    .breakdown-expense { color: #ef4444; }
    .breakdown-total { border-top: 1px solid #a09070; margin-top: 0.25rem; padding-top: 0.25rem; font-weight: bold; }
    .warning { color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      const gs = e.detail.gameState;
      if (!gs) return;
      const player = gs.players[gs.currentPlayer];
      this.state.turn = gs.turn;
      this.state.playerName = player?.name || '';
      this.state.resources = player?.resources || {};
      
      const { deltas, breakdown } = calculateResourceDeltas(player, gs.players);
      this.state.deltas = deltas;
      this.state.breakdown = breakdown;
      
      const actions = getActionsRemaining(player);
      this.state.unitsWithMoves = actions.unitsWithMoves;
    });
    
    // Close breakdown when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('resource-bar')) {
        this.state.showBreakdown = null;
      }
    });
  }),
  html.div({ class: 'info' },
    html.span({ class: 'turn' }, `Turn ${state.turn}`),
    html.span({ class: 'name' }, state.playerName),
    html.span({ 
      class: `actions-left ${state.unitsWithMoves > 0 ? 'has-actions' : 'no-actions'}` 
    }, state.unitsWithMoves > 0 
      ? `⚡ ${state.unitsWithMoves} unit${state.unitsWithMoves > 1 ? 's' : ''} can move`
      : '✓ No actions left'
    )
  ),
  html.div({ class: 'resources' },
    ...['gold', 'food', 'wood', 'stone', 'ore', 'weapons', 'clothing', 'tools']
      .filter(key => (state.resources[key] || 0) > 0 || (state.deltas[key] || 0) !== 0 || ['gold', 'food', 'wood', 'stone'].includes(key))
      .map(key => {
        const value = state.resources[key] || 0;
        const delta = state.deltas[key] || 0;
        const isShowing = state.showBreakdown === key;
        const bd = state.breakdown[key] || { income: [], expenses: [] };
        const nextTurnValue = value + delta;
        
        return html.div({ 
          class: 'res',
          click: (e) => { 
            e.stopPropagation();
            state.showBreakdown = isShowing ? null : key; 
          }
        },
          html.span(RESOURCE_ICONS[key] || '📦'),
          html.span({ class: 'res-value' }, String(value)),
          delta !== 0 ? html.span({ 
            class: `res-delta ${delta > 0 ? 'positive' : 'negative'}` 
          }, delta > 0 ? `+${delta}` : String(delta)) : html.span({ class: 'res-delta neutral' }, '±0'),
          
          // Breakdown popup
          isShowing ? html.div({ class: 'breakdown', click: (e) => e.stopPropagation() },
            html.div({ class: 'breakdown-title' }, `${RESOURCE_ICONS[key]} ${key.charAt(0).toUpperCase() + key.slice(1)}`),
            html.div({ class: 'breakdown-section' },
              html.div({ class: 'breakdown-section-title' }, 'Income:'),
              bd.income.length > 0 
                ? bd.income.map(item => 
                    html.div({ class: 'breakdown-item breakdown-income' },
                      html.span(item.source),
                      html.span(`+${item.amount}`)
                    )
                  )
                : html.div({ class: 'breakdown-item', style: 'color: #888;' }, 'None')
            ),
            html.div({ class: 'breakdown-section' },
              html.div({ class: 'breakdown-section-title' }, 'Expenses:'),
              bd.expenses.length > 0
                ? bd.expenses.map(item =>
                    html.div({ class: 'breakdown-item breakdown-expense' },
                      html.span(item.source),
                      html.span(`-${item.amount}`)
                    )
                  )
                : html.div({ class: 'breakdown-item', style: 'color: #888;' }, 'None')
            ),
            html.div({ class: 'breakdown-total' },
              html.div({ class: 'breakdown-item' },
                html.span('Net per turn:'),
                html.span({ class: delta >= 0 ? 'breakdown-income' : 'breakdown-expense' }, 
                  delta >= 0 ? `+${delta}` : String(delta))
              ),
              html.div({ class: 'breakdown-item' },
                html.span('Next turn:'),
                html.span({ style: nextTurnValue < 0 ? 'color: #ef4444;' : '' }, String(nextTurnValue))
              )
            ),
            nextTurnValue < 0 ? html.div({ class: 'warning' }, '⚠️ Will go negative!') : null
          ) : null
        );
      })
  )
]);

// ============================================================================
// GAME MAP - Canvas-based rendering with module-level state
// ============================================================================

// Module-level map state (survives component re-renders)
const mapState = {
  canvas: null,
  ctx: null,
  overlay: null,
  overlayCtx: null,
  viewOffset: { x: 0, y: 0 },
  zoom: 1,
  tileSize: 40,
  isDragging: false,
  dragStart: null,
  selectedTile: null,
  selectedUnit: null,
  validMoves: [],
  initialized: false,
  component: null
};

function initMapCanvas(shadowRoot, component) {
  if (mapState.initialized && mapState.canvas?.isConnected) {
    console.log('[game-map] Already initialized, just rendering');
    renderMap();
    return;
  }
  
  console.log('[game-map] Initializing canvas');
  mapState.component = component;
  mapState.canvas = shadowRoot.querySelector('.main');
  mapState.overlay = shadowRoot.querySelector('.overlay');
  
  if (!mapState.canvas) {
    console.error('[game-map] Canvas not found!');
    return;
  }
  
  mapState.ctx = mapState.canvas.getContext('2d');
  mapState.overlayCtx = mapState.overlay.getContext('2d');
  
  // Remove old listeners if any
  mapState.canvas.onmousedown = handleMapMouseDown;
  mapState.canvas.onmousemove = handleMapMouseMove;
  mapState.canvas.onmouseup = handleMapMouseUp;
  mapState.canvas.onmouseleave = () => { mapState.isDragging = false; mapState.dragStart = null; };
  mapState.canvas.onwheel = handleMapWheel;
  
  mapState.initialized = true;
  
  const gs = gameStore.getState().gameState;
  if (gs) {
    centerMapOnPlayer(gs);
    renderMap();
  }
  
  console.log('[game-map] Canvas initialized');
}

function getMapSize() {
  if (!mapState.component) return { width: 800, height: 600 };
  return { width: mapState.component.clientWidth || 800, height: mapState.component.clientHeight || 600 };
}

function worldToScreen(x, y) {
  return {
    x: x * mapState.tileSize * mapState.zoom + mapState.viewOffset.x,
    y: y * mapState.tileSize * mapState.zoom + mapState.viewOffset.y
  };
}

function screenToWorld(sx, sy) {
  return {
    x: Math.floor((sx - mapState.viewOffset.x) / (mapState.tileSize * mapState.zoom)),
    y: Math.floor((sy - mapState.viewOffset.y) / (mapState.tileSize * mapState.zoom))
  };
}

function centerMapOnPlayer(gs) {
  const player = gs.players[gs.currentPlayer];
  if (player?.castlePosition) {
    const { width, height } = getMapSize();
    mapState.viewOffset = {
      x: width/2 - player.castlePosition.x * mapState.tileSize * mapState.zoom,
      y: height/2 - player.castlePosition.y * mapState.tileSize * mapState.zoom
    };
    console.log('[game-map] Centered on castle at', player.castlePosition);
  }
}

function renderMap() {
  const gs = gameStore.getState().gameState;
  if (!mapState.canvas || !gs?.map) {
    console.log('[game-map] Render skipped - no canvas or map');
    return;
  }
  
  const { ctx, overlay, overlayCtx, zoom, tileSize, viewOffset } = mapState;
  const { width, height } = getMapSize();
  
  mapState.canvas.width = width;
  mapState.canvas.height = height;
  overlay.width = width;
  overlay.height = height;
  
  const map = gs.map;
  const player = gs.players[gs.currentPlayer];
  const explored = player?.explored || new Set();
  const ts = tileSize * zoom;
  
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  overlayCtx.clearRect(0, 0, width, height);
  
  // Draw tiles
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y * map.width + x];
      if (!tile) continue;
      
      const screen = worldToScreen(x, y);
      if (screen.x + ts < 0 || screen.x > width || screen.y + ts < 0 || screen.y > height) continue;
      
      const key = `${x},${y}`;
      const isExplored = explored.has(key);
      
      // Terrain
      ctx.fillStyle = isExplored ? (TERRAIN_COLORS[tile.terrain.id] || '#555') : '#0a0a15';
      ctx.fillRect(screen.x, screen.y, ts, ts);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.strokeRect(screen.x, screen.y, ts, ts);
      
      if (!isExplored) continue;
      
      // Terrain icon - more visible
      if (ts > 20) {
        ctx.font = `${ts * 0.4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(TERRAIN_ICONS[tile.terrain.id] || '', screen.x + ts/2, screen.y + ts/2);
      }
      
      // Structures - draw with proper font settings
      if (tile.structure) {
        ctx.font = `${ts * 0.6}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        
        if (tile.structure.type === 'castle') {
          // Draw castle background
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(screen.x + ts/2, screen.y + ts/2, ts * 0.35, 0, Math.PI * 2);
          ctx.fill();
          // Draw castle icon
          ctx.fillStyle = '#000';
          ctx.fillText('🏰', screen.x + ts/2, screen.y + ts/2);
          // Owner indicator
          const owner = gs.players.find(p => p.id === tile.structure.owner);
          if (owner) {
            ctx.fillStyle = owner.color;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screen.x + ts - 6, screen.y + 6, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (tile.structure.type === 'mill_site') {
          const mill = tile.structure.mill;
          // Draw mill background
          ctx.fillStyle = mill?.owner ? 'rgba(255,255,255,0.7)' : 'rgba(150,150,150,0.5)';
          ctx.beginPath();
          ctx.arc(screen.x + ts/2, screen.y + ts/2, ts * 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Draw mill icon
          ctx.fillStyle = '#000';
          ctx.fillText(MILL_ICONS[mill?.type?.id] || '⚙️', screen.x + ts/2, screen.y + ts/2);
          // Owner indicator
          if (mill?.owner) {
            const owner = gs.players.find(p => p.id === mill.owner);
            if (owner) {
              ctx.fillStyle = owner.color;
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(screen.x + ts - 6, screen.y + 6, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }
    }
  }
  
  // Draw units
  gs.players.forEach(p => {
    (p.units || []).forEach(unit => {
      const { x, y } = unit.position;
      const key = `${x},${y}`;
      if (!explored.has(key)) return;
      
      const screen = worldToScreen(x, y);
      
      // Unit background circle
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x + ts/2, screen.y + ts/2, ts * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Unit icon - draw on white background for visibility
      ctx.font = `${ts * 0.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(UNIT_ICONS[unit.type.id] || '⚔️', screen.x + ts/2, screen.y + ts/2);
      
      // Health bar
      if (unit.health < 100) {
        const bw = ts * 0.6, bh = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(screen.x + (ts - bw)/2, screen.y + ts - 8, bw, bh);
        ctx.fillStyle = unit.health > 50 ? '#22c55e' : '#eab308';
        ctx.fillRect(screen.x + (ts - bw)/2, screen.y + ts - 8, bw * unit.health/100, bh);
      }
      
      // Movement indicator
      if (unit.movesLeft > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(screen.x + 6, screen.y + 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });
  
  // Valid moves
  mapState.validMoves.forEach(move => {
    const screen = worldToScreen(move.x, move.y);
    overlayCtx.fillStyle = 'rgba(34, 197, 94, 0.3)';
    overlayCtx.fillRect(screen.x, screen.y, ts, ts);
    overlayCtx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(screen.x + 1, screen.y + 1, ts - 2, ts - 2);
  });
  
  // Attack targets (red)
  (mapState.attackTargets || []).forEach(target => {
    const screen = worldToScreen(target.x, target.y);
    overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    overlayCtx.fillRect(screen.x, screen.y, ts, ts);
    overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    overlayCtx.lineWidth = 3;
    overlayCtx.strokeRect(screen.x + 1, screen.y + 1, ts - 2, ts - 2);
    // Draw sword icon
    overlayCtx.font = `${ts * 0.3}px serif`;
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    overlayCtx.fillText('⚔️', screen.x + ts/2, screen.y + ts * 0.2);
  });
  
  // Selection
  if (mapState.selectedTile) {
    const screen = worldToScreen(mapState.selectedTile.x, mapState.selectedTile.y);
    overlayCtx.strokeStyle = '#c9a227';
    overlayCtx.lineWidth = 3;
    overlayCtx.strokeRect(screen.x + 2, screen.y + 2, ts - 4, ts - 4);
  }
}

function handleMapMouseDown(e) {
  mapState.isDragging = false;
  mapState.dragStart = { x: e.clientX, y: e.clientY };
}

function handleMapMouseMove(e) {
  if (!mapState.dragStart) return;
  const dx = e.clientX - mapState.dragStart.x;
  const dy = e.clientY - mapState.dragStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    mapState.isDragging = true;
    mapState.viewOffset.x += dx;
    mapState.viewOffset.y += dy;
    mapState.dragStart = { x: e.clientX, y: e.clientY };
    renderMap();
  }
}

async function handleMapMouseUp(e) {
  const wasDragging = mapState.isDragging;
  mapState.isDragging = false;
  mapState.dragStart = null;
  
  if (wasDragging) return;
  
  const rect = mapState.canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const world = screenToWorld(mx, my);
  
  const gs = gameStore.getState().gameState;
  if (!gs?.map) return;
  
  if (world.x < 0 || world.x >= gs.map.width || world.y < 0 || world.y >= gs.map.height) return;
  
  const player = gs.players[gs.currentPlayer];
  const key = `${world.x},${world.y}`;
  if (!player.explored.has(key)) return;
  
  console.log('[game-map] Click at', world);
  
  // Check if attacking an enemy
  if (mapState.selectedUnit && mapState.attackTargets?.some(t => t.x === world.x && t.y === world.y)) {
    const attacker = player.units.find(u => u.id === mapState.selectedUnit.id);
    if (attacker && attacker.movesLeft > 0) {
      const target = mapState.attackTargets.find(t => t.x === world.x && t.y === world.y);
      
      if (target.type === 'unit') {
        // Find enemy unit
        const enemyPlayer = gs.players.find(p => p.id === target.ownerId);
        const defender = enemyPlayer?.units.find(u => u.position.x === world.x && u.position.y === world.y);
        
        if (defender) {
          // Combat resolution
          const tile = gs.map.tiles[world.y * gs.map.width + world.x];
          const terrainBonus = tile?.terrain?.defense || 0;
          
          const attackRoll = attacker.type.attack + Math.random() * 2;
          const defenseRoll = defender.type.defense + terrainBonus + Math.random() * 2;
          
          const damage = Math.max(5, Math.round((attackRoll / defenseRoll) * 30));
          const counterDamage = Math.max(3, Math.round((defenseRoll / attackRoll) * 15));
          
          defender.health -= damage;
          attacker.health -= counterDamage;
          attacker.movesLeft = 0;
          
          console.log(`[Combat] ${attacker.type.name} vs ${defender.type.name}: dealt ${damage}, took ${counterDamage}`);
          
          // Check for deaths
          if (defender.health <= 0) {
            enemyPlayer.units = enemyPlayer.units.filter(u => u.id !== defender.id);
            gameStore.addNotification(`${attacker.type.name} destroyed enemy ${defender.type.name}!`, 'success');
          } else {
            gameStore.addNotification(`${attacker.type.name} attacked ${defender.type.name} (${damage} dmg)`, 'info');
          }
          
          if (attacker.health <= 0) {
            player.units = player.units.filter(u => u.id !== attacker.id);
            gameStore.addNotification(`${attacker.type.name} was destroyed in combat!`, 'error');
          }
          
          gameStore.setState({ gameState: gs });
        }
      } else if (target.type === 'castle') {
        // Attack enemy castle
        const enemyPlayer = gs.players.find(p => p.id === target.ownerId);
        
        if (enemyPlayer) {
          // Castle has fixed defense
          const castleDefense = 5;
          const attackRoll = attacker.type.attack + Math.random() * 2;
          
          attacker.movesLeft = 0;
          
          // If strong enough attack, capture the castle
          if (attackRoll > castleDefense * 1.5) {
            // Victory!
            gameStore.setState({ 
              phase: 'GAME_OVER', 
              gameState: { ...gs, winner: player.id, winMessage: `${player.name} captured ${enemyPlayer.name}'s castle!` }
            });
            gameStore.addNotification(`Victory! You captured ${enemyPlayer.name}'s castle!`, 'success');
          } else {
            // Repelled, unit takes damage
            attacker.health -= 20;
            if (attacker.health <= 0) {
              player.units = player.units.filter(u => u.id !== attacker.id);
              gameStore.addNotification(`${attacker.type.name} was destroyed attacking the castle!`, 'error');
            } else {
              gameStore.addNotification(`Attack on castle repelled! (${attacker.type.name} took 20 damage)`, 'info');
            }
            gameStore.setState({ gameState: gs });
          }
        }
      }
      
      mapState.selectedUnit = null;
      mapState.validMoves = [];
      mapState.attackTargets = [];
      mapState.selectedTile = world;
      window.dispatchEvent(new CustomEvent('game-map.tile-selected', { detail: { tile: world } }));
      renderMap();
      return;
    }
  }
  
  // Check if moving to valid move
  if (mapState.selectedUnit && mapState.validMoves.some(m => m.x === world.x && m.y === world.y)) {
    const unit = player.units.find(u => u.id === mapState.selectedUnit.id);
    if (unit) {
      console.log('[game-map] Moving unit to', world);
      unit.position = { x: world.x, y: world.y };
      unit.movesLeft = Math.max(0, unit.movesLeft - 1);
      
      // Reveal fog
      for (let dy = -unit.type.vision; dy <= unit.type.vision; dy++) {
        for (let dx = -unit.type.vision; dx <= unit.type.vision; dx++) {
          if (Math.sqrt(dx*dx + dy*dy) <= unit.type.vision) {
            player.explored.add(`${world.x + dx},${world.y + dy}`);
          }
        }
      }
      
      gameStore.setState({ gameState: gs });
      gameStore.addNotification(`${unit.type.name} moved`, 'success');
    }
    mapState.selectedUnit = null;
    mapState.validMoves = [];
    mapState.attackTargets = [];
    mapState.selectedTile = world;
    window.dispatchEvent(new CustomEvent('game-map.tile-selected', { detail: { tile: world } }));
    renderMap();
    return;
  }
  
  // Select tile/unit
  mapState.selectedTile = world;
  const unit = player.units?.find(u => u.position.x === world.x && u.position.y === world.y);
  
  if (unit && unit.movesLeft > 0) {
    console.log('[game-map] Selected unit:', unit.type.name);
    mapState.selectedUnit = unit;
    mapState.attackTargets = [];
    
    try {
      const result = await gameWorker.getValidMoves(unit.id, player.id, gs);
      mapState.validMoves = result.moves || [];
      console.log('[game-map] Valid moves:', mapState.validMoves.length);
      
      // Find attack targets (adjacent enemy units and castles)
      const targets = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = unit.position.x + dx;
          const ty = unit.position.y + dy;
          
          // Check for enemy units
          gs.players.forEach(p => {
            if (p.id === player.id) return;
            p.units?.forEach(enemyUnit => {
              if (enemyUnit.position.x === tx && enemyUnit.position.y === ty) {
                targets.push({ x: tx, y: ty, type: 'unit', ownerId: p.id, name: enemyUnit.type.name });
              }
            });
            // Check for enemy castle
            if (p.castlePosition?.x === tx && p.castlePosition?.y === ty) {
              targets.push({ x: tx, y: ty, type: 'castle', ownerId: p.id, name: `${p.name}'s Castle` });
            }
          });
        }
      }
      mapState.attackTargets = targets;
      console.log('[game-map] Attack targets:', targets.length);
      
    } catch (err) {
      console.error('[game-map] Failed to get valid moves:', err);
      mapState.validMoves = [];
      mapState.attackTargets = [];
    }
  } else {
    mapState.selectedUnit = null;
    mapState.validMoves = [];
    mapState.attackTargets = [];
  }
  
  window.dispatchEvent(new CustomEvent('game-map.tile-selected', { detail: { tile: world, unit } }));
  renderMap();
}

function handleMapWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.5, Math.min(3, mapState.zoom * delta));
  const rect = mapState.canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  mapState.viewOffset.x = mx - (mx - mapState.viewOffset.x) * (newZoom / mapState.zoom);
  mapState.viewOffset.y = my - (my - mapState.viewOffset.y) * (newZoom / mapState.zoom);
  mapState.zoom = newZoom;
  renderMap();
}

// Set up global listeners once
window.addEventListener('game-store.updated', (e) => {
  const gs = e.detail.gameState;
  if (gs && mapState.initialized) {
    if (mapState.viewOffset.x === 0 && mapState.viewOffset.y === 0) {
      centerMapOnPlayer(gs);
    }
    renderMap();
  }
});

window.addEventListener('game-map.zoom-in', () => { mapState.zoom = Math.min(3, mapState.zoom * 1.2); renderMap(); });
window.addEventListener('game-map.zoom-out', () => { mapState.zoom = Math.max(0.5, mapState.zoom / 1.2); renderMap(); });
window.addEventListener('resize', renderMap);

// Listen for unit selection from unit list panel
window.addEventListener('unit-list.unit-clicked', async (e) => {
  const unit = e.detail;
  if (!unit) return;
  
  const gs = gameStore.getState().gameState;
  if (!gs) return;
  
  const player = gs.players[gs.currentPlayer];
  
  console.log('[game-map] Unit selected from list:', unit.type.name, 'movesLeft:', unit.movesLeft);
  
  // Center view on unit
  const { width, height } = getMapSize();
  mapState.viewOffset = {
    x: width/2 - unit.position.x * mapState.tileSize * mapState.zoom,
    y: height/2 - unit.position.y * mapState.tileSize * mapState.zoom
  };
  
  mapState.selectedTile = { x: unit.position.x, y: unit.position.y };
  
  if (unit.movesLeft > 0) {
    mapState.selectedUnit = unit;
    mapState.attackTargets = [];
    
    try {
      const result = await gameWorker.getValidMoves(unit.id, player.id, gs);
      mapState.validMoves = result.moves || [];
      
      // Find attack targets
      const targets = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = unit.position.x + dx;
          const ty = unit.position.y + dy;
          
          gs.players.forEach(p => {
            if (p.id === player.id) return;
            p.units?.forEach(enemyUnit => {
              if (enemyUnit.position.x === tx && enemyUnit.position.y === ty) {
                targets.push({ x: tx, y: ty, type: 'unit', ownerId: p.id, name: enemyUnit.type.name });
              }
            });
            if (p.castlePosition?.x === tx && p.castlePosition?.y === ty) {
              targets.push({ x: tx, y: ty, type: 'castle', ownerId: p.id, name: `${p.name}'s Castle` });
            }
          });
        }
      }
      mapState.attackTargets = targets;
      
    } catch (err) {
      console.error('[game-map] Failed to get valid moves:', err);
      mapState.validMoves = [];
      mapState.attackTargets = [];
    }
  } else {
    mapState.selectedUnit = null;
    mapState.validMoves = [];
    mapState.attackTargets = [];
  }
  
  window.dispatchEvent(new CustomEvent('game-map.tile-selected', { detail: { tile: mapState.selectedTile, unit } }));
  renderMap();
});

pfusch("game-map", {}, (state, trigger) => [
  css`
    :host { display: block; width: 100%; height: 100%; }
    .wrapper { width: 100%; height: 100%; position: relative; }
    canvas { position: absolute; top: 0; left: 0; }
    .overlay { pointer-events: none; }
    .controls { position: absolute; bottom: 1rem; right: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .controls button { width: 32px; height: 32px; background: rgba(42, 24, 16, 0.9); border: 2px solid #c9a227; color: #f4e4c1; cursor: pointer; }
    .controls button:hover { background: #c9a227; color: #2a1810; }
  `,
  script(function() {
    console.log('[game-map] Component script running');
    // Initialize canvas after a brief delay to ensure DOM is ready
    setTimeout(() => initMapCanvas(this.shadowRoot, this.component), 50);
  }),
  html.div({ class: 'wrapper' },
    html.canvas({ class: 'main' }),
    html.canvas({ class: 'overlay' }),
    html.div({ class: 'controls' },
      html.button({ click: () => window.dispatchEvent(new CustomEvent('game-map.zoom-in')) }, '+'),
      html.button({ click: () => window.dispatchEvent(new CustomEvent('game-map.zoom-out')) }, '−')
    )
  )
]);

// ============================================================================
// UNIT LIST
// ============================================================================

pfusch("unit-list", { units: [], selectedId: null }, (state, trigger) => [
  css`
    :host { display: block; padding: 1rem; }
    .title { color: #c9a227; font-size: 1rem; margin-bottom: 1rem; border-bottom: 1px solid #a09070; padding-bottom: 0.5rem; }
    .unit { background: rgba(0,0,0,0.3); border: 1px solid #a09070; padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; border-radius: 4px; }
    .unit:hover { border-color: #c9a227; }
    .unit.selected { border-color: #c9a227; background: rgba(201, 162, 39, 0.2); }
    .unit.no-moves { opacity: 0.6; }
    .header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .icon { font-size: 1.2rem; }
    .name { color: #f4e4c1; }
    .stats { font-size: 0.75rem; color: #a09070; }
    .moves { font-size: 0.7rem; margin-top: 0.25rem; }
    .moves.can-move { color: #22c55e; }
    .moves.no-move { color: #a09070; }
    .empty { color: #a09070; font-style: italic; text-align: center; padding: 2rem; }
    .health-bar { height: 4px; background: #333; border-radius: 2px; margin-top: 0.25rem; }
    .health-fill { height: 100%; border-radius: 2px; }
    .upkeep { font-size: 0.65rem; color: #c9a227; margin-top: 0.25rem; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      const gs = e.detail.gameState;
      if (gs) {
        const player = gs.players[gs.currentPlayer];
        this.state.units = player?.units || [];
      }
    });
    window.addEventListener('game-map.tile-selected', (e) => {
      this.state.selectedId = e.detail.unit?.id || null;
    });
  }),
  html.h3({ class: 'title' }, `🗡️ Your Forces (${state.units.length})`),
  state.units.length === 0
    ? html.div({ class: 'empty' }, 'No units')
    : state.units.map(u =>
        html.div({ 
          class: `unit ${state.selectedId === u.id ? 'selected' : ''} ${u.movesLeft === 0 ? 'no-moves' : ''}`, 
          click: () => { 
            state.selectedId = u.id; 
            window.dispatchEvent(new CustomEvent('unit-list.unit-clicked', { detail: u }));
          } 
        },
          html.div({ class: 'header' },
            html.span({ class: 'icon' }, UNIT_ICONS[u.type.id] || '⚔️'),
            html.span({ class: 'name' }, u.type.name)
          ),
          html.div({ class: 'stats' }, `⚔️${u.type.attack} 🛡️${u.type.defense} 👁️${u.type.vision}`),
          html.div({ class: 'health-bar' },
            html.div({ class: 'health-fill', style: `width: ${u.health}%; background: ${u.health > 50 ? '#22c55e' : u.health > 25 ? '#eab308' : '#ef4444'};` })
          ),
          html.div({ class: `moves ${u.movesLeft > 0 ? 'can-move' : 'no-move'}` }, 
            u.movesLeft > 0 ? `⚡ Moves: ${u.movesLeft}/${u.type.movement}` : `💤 No moves left`
          ),
          html.div({ class: 'upkeep' }, `Upkeep: ${UNIT_UPKEEP[u.type.id] || 1}🪙/turn`)
        )
      )
]);

// ============================================================================
// INFO PANEL
// ============================================================================

const UNIT_COSTS = {
  scout: { food: 2 },
  militia: { food: 3, wood: 1 },
  infantry: { food: 4, weapons: 1 },
  cavalry: { food: 5, weapons: 1, tools: 1 }
};

const UNIT_TYPES_INFO = {
  scout: { id: 'scout', name: 'Scout', attack: 1, defense: 1, movement: 4, vision: 3 },
  militia: { id: 'militia', name: 'Militia', attack: 2, defense: 2, movement: 2, vision: 1 },
  infantry: { id: 'infantry', name: 'Infantry', attack: 4, defense: 3, movement: 2, vision: 1 },
  cavalry: { id: 'cavalry', name: 'Cavalry', attack: 3, defense: 2, movement: 4, vision: 2 }
};

function canAfford(resources, cost) {
  return Object.entries(cost).every(([res, amt]) => (resources[res] || 0) >= amt);
}

pfusch("info-panel", { tile: null, tileData: null, canClaim: false, isOwnCastle: false, showRecruit: false }, (state) => [
  css`
    :host { display: block; padding: 1rem; }
    .title { color: #c9a227; font-size: 1rem; margin-bottom: 1rem; border-bottom: 1px solid #a09070; padding-bottom: 0.5rem; }
    .section { margin-bottom: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.3); border-radius: 4px; }
    .terrain { display: flex; align-items: center; gap: 0.5rem; }
    .terrain-icon { font-size: 1.5rem; }
    .terrain-name { color: #f4e4c1; text-transform: capitalize; }
    .terrain-stats { font-size: 0.8rem; color: #a09070; }
    .coords { font-size: 0.75rem; color: #a09070; margin-top: 0.5rem; }
    .empty { color: #a09070; font-style: italic; text-align: center; padding: 2rem; }
    .structure { margin-top: 0.75rem; padding: 0.75rem; background: rgba(201, 162, 39, 0.1); border: 1px solid #c9a227; border-radius: 4px; }
    .structure-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .structure-icon { font-size: 1.3rem; }
    .structure-name { color: #c9a227; }
    .production { font-size: 0.8rem; margin-top: 0.5rem; }
    .produces { color: #22c55e; }
    .consumes { color: #ef4444; }
    .owner { font-size: 0.75rem; margin-top: 0.5rem; padding: 0.25rem 0.5rem; display: inline-block; border-radius: 4px; }
    .claim-btn, .recruit-btn { width: 100%; margin-top: 0.5rem; padding: 0.5rem; background: #c9a227; color: #2a1810; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
    .claim-btn:hover, .recruit-btn:hover { background: #ddb530; }
    .claim-btn:disabled, .recruit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .claim-section { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #a09070; }
    .claim-impact { background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; }
    .claim-impact-title { color: #a09070; font-size: 0.8rem; margin-bottom: 0.25rem; }
    .claim-impact-item { display: flex; gap: 0.5rem; font-size: 0.85rem; color: #f4e4c1; }
    .claim-impact-item .produces { color: #22c55e; }
    .claim-impact-item .consumes { color: #ef4444; }
    .claim-warning { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .warning-icon { color: #ef4444; }
    .recruit-panel { margin-top: 0.75rem; }
    .recruit-title { color: #c9a227; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .unit-option { padding: 0.5rem; margin-bottom: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid #a09070; border-radius: 4px; cursor: pointer; }
    .unit-option:hover { border-color: #c9a227; }
    .unit-option.disabled { opacity: 0.5; cursor: not-allowed; }
    .unit-option-header { display: flex; justify-content: space-between; align-items: center; }
    .unit-option-name { color: #f4e4c1; display: flex; align-items: center; gap: 0.3rem; }
    .unit-option-stats { font-size: 0.7rem; color: #a09070; margin-top: 0.25rem; }
    .unit-option-cost { font-size: 0.75rem; color: #c9a227; }
    .cost-item { margin-right: 0.5rem; }
    .cost-ok { color: #22c55e; }
    .cost-bad { color: #ef4444; }
  `,
  script(function() {
    window.addEventListener('game-map.tile-selected', (e) => {
      this.state.tile = e.detail.tile;
      this.state.showRecruit = false;
      const gs = gameStore.getState().gameState;
      if (gs && this.state.tile) {
        const idx = this.state.tile.y * gs.map.width + this.state.tile.x;
        this.state.tileData = gs.map.tiles[idx];
        const player = gs.players[gs.currentPlayer];
        
        // Check if this is player's castle
        const structure = this.state.tileData?.structure;
        this.state.isOwnCastle = structure?.type === 'castle' && structure.owner === player.id;
        
        // Check if can claim mill
        if (structure?.type === 'mill_site' && structure.mill && !structure.mill.owner) {
          const hasAdjacentUnit = player.units?.some(u => {
            const dx = Math.abs(u.position.x - this.state.tile.x);
            const dy = Math.abs(u.position.y - this.state.tile.y);
            return dx <= 1 && dy <= 1;
          });
          this.state.canClaim = hasAdjacentUnit;
        } else {
          this.state.canClaim = false;
        }
      }
    });
    
    window.addEventListener('game-store.updated', () => {
      // Refresh affordability when resources change
      if (this.state.showRecruit) {
        this.state.showRecruit = true; // trigger re-render
      }
    });
  }),
  html.h3({ class: 'title' }, '📜 Details'),
  !state.tile
    ? html.div({ class: 'empty' }, 'Select a tile')
    : html.div(
        // Terrain info
        state.tileData ? html.div({ class: 'section' },
          html.div({ class: 'terrain' },
            html.span({ class: 'terrain-icon' }, TERRAIN_ICONS[state.tileData.terrain.id] || '🌍'),
            html.div(
              html.div({ class: 'terrain-name' }, state.tileData.terrain.id),
              html.div({ class: 'terrain-stats' }, `Move: ${state.tileData.terrain.moveCost} | Def: +${state.tileData.terrain.defense}`)
            )
          ),
          html.div({ class: 'coords' }, `Position: (${state.tile.x}, ${state.tile.y})`)
        ) : null,
        
        // Structure info
        state.tileData?.structure ? html.div({ class: 'structure' },
          html.div({ class: 'structure-header' },
            html.span({ class: 'structure-icon' }, 
              state.tileData.structure.type === 'castle' ? '🏰' : 
              MILL_ICONS[state.tileData.structure.mill?.type?.id] || '⚙️'
            ),
            html.span({ class: 'structure-name' }, 
              state.tileData.structure.type === 'castle' ? 'Castle' :
              state.tileData.structure.mill?.type?.name || 'Mill Site'
            )
          ),
          // Production info for mills
          state.tileData.structure.mill?.type ? html.div({ class: 'production' },
            ...Object.entries(state.tileData.structure.mill.type.produces || {}).map(([res, amt]) =>
              html.div({ class: 'produces' }, `+${amt} ${RESOURCE_ICONS[res] || ''} ${res}`)
            ),
            ...Object.entries(state.tileData.structure.mill.type.consumes || {}).map(([res, amt]) =>
              html.div({ class: 'consumes' }, `-${amt} ${RESOURCE_ICONS[res] || ''} ${res}`)
            )
          ) : null,
          // Owner info
          (() => {
            const owner = state.tileData.structure.owner || state.tileData.structure.mill?.owner;
            const gs = gameStore.getState().gameState;
            if (owner && gs) {
              const ownerPlayer = gs.players.find(p => p.id === owner);
              return html.div({ class: 'owner', style: `background: ${ownerPlayer?.color}33; color: ${ownerPlayer?.color};` },
                `Owned by: ${ownerPlayer?.name}`
              );
            } else if (state.tileData.structure.type === 'mill_site') {
              return html.div({ class: 'owner', style: 'background: #33333355; color: #999;' }, '⚪ Unclaimed');
            }
            return null;
          })(),
          // Claim button for mills with impact preview
          state.canClaim ? (() => {
            const gs = gameStore.getState().gameState;
            const player = gs?.players[gs.currentPlayer];
            const mill = state.tileData.structure.mill;
            const millType = mill?.type;
            
            // Calculate current deltas
            const { deltas: currentDeltas } = calculateResourceDeltas(player, gs.players);
            
            // Calculate impact of claiming this mill
            const impact = {};
            let hasNegativeImpact = false;
            
            if (millType) {
              Object.entries(millType.produces || {}).forEach(([res, amt]) => {
                impact[res] = (impact[res] || 0) + amt;
              });
              Object.entries(millType.consumes || {}).forEach(([res, amt]) => {
                impact[res] = (impact[res] || 0) - amt;
                const newDelta = (currentDeltas[res] || 0) + (impact[res] || 0);
                const currentValue = player.resources[res] || 0;
                if (currentValue + newDelta < 0) {
                  hasNegativeImpact = true;
                }
              });
            }
            
            return html.div({ class: 'claim-section' },
              html.div({ class: 'claim-impact' },
                html.div({ class: 'claim-impact-title' }, 'If claimed:'),
                ...Object.entries(impact).map(([res, amt]) => {
                  const newDelta = (currentDeltas[res] || 0) + amt;
                  const currentValue = player.resources[res] || 0;
                  const willGoNegative = currentValue + newDelta < 0;
                  return html.div({ class: 'claim-impact-item' },
                    html.span(`${RESOURCE_ICONS[res] || ''}${res}:`),
                    html.span({ class: amt >= 0 ? 'produces' : 'consumes' }, 
                      `${amt >= 0 ? '+' : ''}${amt}/turn`
                    ),
                    willGoNegative ? html.span({ class: 'warning-icon' }, ' ⚠️') : null
                  );
                })
              ),
              hasNegativeImpact ? html.div({ class: 'claim-warning' }, 
                '⚠️ Warning: Will cause resource shortage!'
              ) : null,
              html.button({ 
                class: 'claim-btn',
                click: () => {
                  const gs = gameStore.getState().gameState;
                  const player = gs.players[gs.currentPlayer];
                  const mill = state.tileData.structure.mill;
                  if (mill) {
                    mill.owner = player.id;
                    player.mills = player.mills || [];
                    player.mills.push({ position: { ...state.tile }, type: mill.type });
                    gameStore.setState({ gameState: gs });
                    gameStore.addNotification(`Claimed ${mill.type.name}!`, 'success');
                    state.canClaim = false;
                  }
                }
              }, '🏴 Claim Mill')
            );
          })() : null,
          // Recruit button for own castle
          state.isOwnCastle ? html.button({
            class: 'recruit-btn',
            click: () => { state.showRecruit = !state.showRecruit; }
          }, state.showRecruit ? '✕ Close' : '⚔️ Recruit Units') : null
        ) : null,
        
        // Recruit panel
        state.showRecruit && state.isOwnCastle ? html.div({ class: 'recruit-panel' },
          html.div({ class: 'recruit-title' }, 'Available Units:'),
          ...Object.entries(UNIT_TYPES_INFO).map(([id, unit]) => {
            const gs = gameStore.getState().gameState;
            const player = gs?.players[gs.currentPlayer];
            const resources = player?.resources || {};
            const cost = UNIT_COSTS[id] || {};
            const affordable = canAfford(resources, cost);
            
            return html.div({
              class: `unit-option ${affordable ? '' : 'disabled'}`,
              click: () => {
                if (!affordable) {
                  gameStore.addNotification('Not enough resources!', 'error');
                  return;
                }
                const gs = gameStore.getState().gameState;
                const player = gs.players[gs.currentPlayer];
                
                // Deduct resources
                Object.entries(cost).forEach(([res, amt]) => {
                  player.resources[res] -= amt;
                });
                
                // Create unit at castle
                const newUnit = {
                  id: `${player.id}_${id}_${Date.now()}`,
                  type: { ...unit },
                  position: { ...player.castlePosition },
                  movesLeft: 0, // Can't move on turn created
                  health: 100
                };
                player.units.push(newUnit);
                
                gameStore.setState({ gameState: gs });
                gameStore.addNotification(`Recruited ${unit.name}!`, 'success');
              }
            },
              html.div({ class: 'unit-option-header' },
                html.span({ class: 'unit-option-name' }, 
                  html.span(UNIT_ICONS[id] || '⚔️'),
                  html.span(unit.name)
                ),
                html.span({ class: 'unit-option-cost' },
                  ...Object.entries(cost).map(([res, amt]) => {
                    const have = resources[res] || 0;
                    return html.span({ class: `cost-item ${have >= amt ? 'cost-ok' : 'cost-bad'}` },
                      `${RESOURCE_ICONS[res] || ''}${amt}`
                    );
                  })
                )
              ),
              html.div({ class: 'unit-option-stats' },
                `⚔️${unit.attack} 🛡️${unit.defense} 👟${unit.movement} 👁️${unit.vision}`
              )
            );
          })
        ) : null
      )
]);

// ============================================================================
// ACTION BAR
// ============================================================================

pfusch("action-bar", { canEndTurn: true, unitsWithMoves: 0, showConfirm: false }, (state) => [
  css`
    :host { display: flex; justify-content: space-between; align-items: center; position: relative; }
    .tip { font-size: 0.8rem; color: #a09070; }
    .actions { display: flex; gap: 0.5rem; align-items: center; }
    .btn { padding: 0.5rem 1rem; background: transparent; border: 2px solid #a09070; color: #f4e4c1; cursor: pointer; border-radius: 4px; }
    .btn:hover { border-color: #c9a227; color: #c9a227; }
    .btn.primary { background: #c9a227; color: #2a1810; border-color: #c9a227; }
    .btn.primary:hover { background: #ddb530; }
    .btn.warning { background: #b45309; border-color: #b45309; }
    .btn.warning:hover { background: #d97706; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .confirm-dialog {
      position: absolute; bottom: 100%; right: 0; margin-bottom: 0.5rem;
      background: rgba(42, 24, 16, 0.98); border: 2px solid #c9a227; border-radius: 4px;
      padding: 1rem; min-width: 250px; z-index: 100;
    }
    .confirm-title { color: #c9a227; font-weight: bold; margin-bottom: 0.5rem; }
    .confirm-message { color: #f4e4c1; font-size: 0.9rem; margin-bottom: 0.75rem; }
    .confirm-warning { color: #fbbf24; font-size: 0.85rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    .confirm-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .confirm-btn { padding: 0.4rem 0.75rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .confirm-btn.yes { background: #c9a227; color: #2a1810; }
    .confirm-btn.no { background: transparent; border: 1px solid #a09070; color: #f4e4c1; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      const gs = e.detail.gameState;
      this.state.canEndTurn = gs?.phase === 'PLAYER_TURN';
      if (gs) {
        const player = gs.players[gs.currentPlayer];
        this.state.unitsWithMoves = (player?.units || []).filter(u => u.movesLeft > 0).length;
      }
    });
  }),
  html.div({ class: 'tip' }, '💡 Click unit, then green/red tile to move/attack'),
  html.div({ class: 'actions' },
    html.button({ class: 'btn', click: () => gameStore.addNotification('Drag to pan, scroll to zoom. Red tiles = attack targets.', 'info') }, '❓'),
    
    // Confirmation dialog
    state.showConfirm ? html.div({ class: 'confirm-dialog' },
      html.div({ class: 'confirm-title' }, '⚠️ End Turn?'),
      html.div({ class: 'confirm-warning' }, 
        `⚡ ${state.unitsWithMoves} unit${state.unitsWithMoves > 1 ? 's' : ''} can still move!`
      ),
      html.div({ class: 'confirm-message' }, 'Are you sure you want to end your turn?'),
      html.div({ class: 'confirm-buttons' },
        html.button({ class: 'confirm-btn no', click: () => { state.showConfirm = false; } }, 'Cancel'),
        html.button({ class: 'confirm-btn yes', click: async () => {
          state.showConfirm = false;
          await endTurn(state);
        }}, 'End Turn')
      )
    ) : null,
    
    html.button({
      class: `btn ${state.unitsWithMoves > 0 ? 'warning' : 'primary'}`,
      disabled: !state.canEndTurn,
      click: async () => {
        if (!state.canEndTurn) return;
        
        // If units can still move, show confirmation
        if (state.unitsWithMoves > 0) {
          state.showConfirm = true;
          return;
        }
        
        await endTurn(state);
      }
    }, state.unitsWithMoves > 0 ? `⚠️ End Turn (${state.unitsWithMoves} can move)` : '⏭️ End Turn')
  )
]);

async function endTurn(state) {
  console.log('[action-bar] End turn clicked');
  state.canEndTurn = false;
  
  const gs = gameStore.getState().gameState;
  const playerBefore = gs.players[gs.currentPlayer];
  const unitsBefore = playerBefore.units?.length || 0;
  
  try {
    const result = await gameWorker.processTurn(gs);
    console.log('[action-bar] Turn processed, new turn:', result.turn, 'phase:', result.phase);
    
    result.players = result.players.map(p => ({
      ...p,
      explored: new Set(p.explored || [])
    }));
    
    // Check for economy events
    const playerAfter = result.players.find(p => p.id === playerBefore.id);
    const unitsAfter = playerAfter?.units?.length || 0;
    
    if (unitsAfter < unitsBefore) {
      const disbanded = unitsBefore - unitsAfter;
      gameStore.addNotification(`⚠️ ${disbanded} unit(s) disbanded - couldn't pay gold upkeep!`, 'error');
    }
    
    // Check for any game events
    (result.events || []).forEach(event => {
      if (event.playerId === playerBefore.id) {
        if (event.type === 'TRADE_FAILED') {
          gameStore.addNotification(`📉 Trade agreement failed: ${event.message}`, 'error');
        } else if (event.type === 'MARKET_ORDER_CANCELLED') {
          gameStore.addNotification(`📉 ${event.message}`, 'error');
        }
      }
    });
    
    // Clear events after showing
    result.events = [];
    
    gameStore.setState({ gameState: result });
    
    // Handle AI turn
    if (result.phase === 'AI_TURN') {
      gameStore.addNotification('AI is thinking...', 'info');
      setTimeout(async () => {
        const aiResult = await gameWorker.processTurn(result);
        aiResult.players = aiResult.players.map(p => ({
          ...p,
          explored: new Set(p.explored || [])
        }));
        gameStore.setState({ gameState: aiResult });
        gameStore.addNotification('Your turn!', 'success');
      }, 1000);
    }
  } catch (err) {
    console.error('[action-bar] End turn failed:', err);
    gameStore.addNotification('Turn failed: ' + err.message, 'error');
    state.canEndTurn = true;
  }
}

// ============================================================================
// TRADE PANEL
// ============================================================================

pfusch("trade-panel", { 
  expanded: false,
  tab: 'market', // 'market' or 'agreements'
  buyResource: 'food',
  buyAmount: 1,
  sellResource: 'food',
  sellAmount: 1,
  // For player trade
  tradePartner: null,
  offerResource: 'food',
  offerAmount: 1,
  requestResource: 'wood',
  requestAmount: 1
}, (state) => [
  css`
    :host { display: block; padding: 1rem; border-top: 1px solid #a09070; }
    .title { color: #c9a227; font-size: 1rem; margin-bottom: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .title:hover { color: #ddb530; }
    .toggle { font-size: 0.8rem; }
    .tabs { display: flex; gap: 0.25rem; margin-bottom: 0.75rem; }
    .tab { flex: 1; padding: 0.4rem; background: rgba(0,0,0,0.3); border: 1px solid #a09070; color: #a09070; cursor: pointer; text-align: center; font-size: 0.8rem; }
    .tab:hover { border-color: #c9a227; }
    .tab.active { background: #c9a227; color: #2a1810; border-color: #c9a227; }
    .section { margin-bottom: 1rem; }
    .section-title { color: #a09070; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .trade-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .trade-select { flex: 1; padding: 0.4rem; background: #2a1810; border: 1px solid #a09070; color: #f4e4c1; font-size: 0.85rem; }
    .trade-input { width: 50px; padding: 0.4rem; background: #2a1810; border: 1px solid #a09070; color: #f4e4c1; text-align: center; }
    .trade-btn { padding: 0.4rem 0.75rem; background: #c9a227; color: #2a1810; border: none; cursor: pointer; font-size: 0.85rem; border-radius: 4px; }
    .trade-btn:hover { background: #ddb530; }
    .trade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .trade-btn.cancel { background: #8b1a1a; color: #f4e4c1; }
    .trade-btn.cancel:hover { background: #a52a2a; }
    .cost { font-size: 0.8rem; color: #a09070; }
    .cost-value { color: #c9a227; }
    .cost-value.expensive { color: #ef4444; }
    .agreement { padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid #a09070; border-radius: 4px; margin-bottom: 0.5rem; }
    .agreement-header { display: flex; justify-content: space-between; align-items: center; }
    .agreement-partner { color: #f4e4c1; font-size: 0.9rem; }
    .agreement-details { font-size: 0.8rem; color: #a09070; margin-top: 0.25rem; }
    .agreement-give { color: #ef4444; }
    .agreement-receive { color: #22c55e; }
    .no-agreements { color: #a09070; font-style: italic; font-size: 0.85rem; text-align: center; padding: 1rem; }
    .player-option { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; background: rgba(0,0,0,0.2); border: 1px solid #a09070; margin-bottom: 0.25rem; cursor: pointer; }
    .player-option:hover { border-color: #c9a227; }
    .player-option.selected { border-color: #c9a227; background: rgba(201, 162, 39, 0.1); }
    .player-color { width: 12px; height: 12px; border-radius: 50%; }
    .player-name { color: #f4e4c1; font-size: 0.85rem; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      // Refresh on game state changes
    });
  }),
  html.div({ class: 'title', click: () => { state.expanded = !state.expanded; } },
    html.span('💰 Trade'),
    html.span({ class: 'toggle' }, state.expanded ? '▼' : '▶')
  ),
  state.expanded ? html.div({ class: 'content' },
    // Tabs
    html.div({ class: 'tabs' },
      html.div({ class: `tab ${state.tab === 'market' ? 'active' : ''}`, click: () => { state.tab = 'market'; } }, '🏪 Market'),
      html.div({ class: `tab ${state.tab === 'agreements' ? 'active' : ''}`, click: () => { state.tab = 'agreements'; } }, '🤝 Deals')
    ),
    
    // Market tab - external trade
    state.tab === 'market' ? html.div({ class: 'market' },
      // Active market orders
      (() => {
        const gs = gameStore.getState().gameState;
        const player = gs?.players[gs.currentPlayer];
        const marketOrders = (player?.marketOrders || []);
        
        if (marketOrders.length > 0) {
          return html.div({ class: 'section' },
            html.div({ class: 'section-title' }, '📋 Recurring Orders'),
            ...marketOrders.map((order, index) => {
              const isBuy = order.type === 'buy';
              const rate = TRADE_RATES[order.resource]?.[order.type] || 1;
              const goldPerTurn = rate * order.amount;
              
              return html.div({ class: 'agreement', style: `border-color: ${isBuy ? '#3b82f6' : '#22c55e'};` },
                html.div({ class: 'agreement-header' },
                  html.span({ class: 'agreement-partner' }, 
                    `${isBuy ? '📥 Buy' : '📤 Sell'} ${order.amount} ${RESOURCE_ICONS[order.resource]} ${order.resource}/turn`
                  ),
                  html.button({ 
                    class: 'trade-btn cancel',
                    click: () => {
                      player.marketOrders = player.marketOrders.filter((_, i) => i !== index);
                      gameStore.setState({ gameState: gs });
                      gameStore.addNotification('Market order cancelled', 'info');
                    }
                  }, '✕')
                ),
                html.div({ class: 'agreement-details' },
                  isBuy 
                    ? html.span({ class: 'agreement-give' }, `Cost: ${goldPerTurn}🪙/turn`)
                    : html.span({ class: 'agreement-receive' }, `Gain: ${goldPerTurn}🪙/turn`)
                )
              );
            })
          );
        }
        return null;
      })(),
      
      // Buy section
      html.div({ class: 'section' },
        html.div({ class: 'section-title' }, '📥 Buy (expensive)'),
        html.div({ class: 'trade-row' },
          html.select({ class: 'trade-select', change: (e) => { state.buyResource = e.target.value; } },
            ...Object.keys(TRADE_RATES).map(res => 
              html.option({ value: res, selected: state.buyResource === res }, 
                `${RESOURCE_ICONS[res]} ${res}`
              )
            )
          ),
          html.input({ 
            class: 'trade-input', 
            type: 'number', 
            min: '1', 
            max: '10',
            value: state.buyAmount,
            change: (e) => { state.buyAmount = Math.max(1, Math.min(10, parseInt(e.target.value) || 1)); }
          }),
          html.button({ 
            class: 'trade-btn',
            click: () => {
              const gs = gameStore.getState().gameState;
              const player = gs.players[gs.currentPlayer];
              const cost = TRADE_RATES[state.buyResource].buy * state.buyAmount;
              if (player.resources.gold >= cost) {
                player.resources.gold -= cost;
                player.resources[state.buyResource] = (player.resources[state.buyResource] || 0) + state.buyAmount;
                gameStore.setState({ gameState: gs });
                gameStore.addNotification(`Bought ${state.buyAmount} ${state.buyResource} for ${cost} gold`, 'success');
              } else {
                gameStore.addNotification('Not enough gold!', 'error');
              }
            }
          }, 'Buy'),
          html.button({ 
            class: 'trade-btn',
            style: 'background: #3b82f6;',
            title: 'Set up recurring buy order',
            click: () => {
              const gs = gameStore.getState().gameState;
              const player = gs.players[gs.currentPlayer];
              player.marketOrders = player.marketOrders || [];
              player.marketOrders.push({
                type: 'buy',
                resource: state.buyResource,
                amount: state.buyAmount
              });
              gameStore.setState({ gameState: gs });
              gameStore.addNotification(`Set up recurring buy: ${state.buyAmount} ${state.buyResource}/turn`, 'success');
            }
          }, '🔄')
        ),
        (() => {
          const cost = TRADE_RATES[state.buyResource]?.buy * state.buyAmount;
          const gs = gameStore.getState().gameState;
          const gold = gs?.players[gs.currentPlayer]?.resources?.gold || 0;
          return html.div({ class: 'cost' }, 
            'Cost: ', 
            html.span({ class: `cost-value ${cost > gold ? 'expensive' : ''}` }, `${cost} 🪙`),
            html.span({ style: 'color: #a09070; margin-left: 0.5rem; font-size: 0.75rem;' }, '(🔄 = recurring)')
          );
        })()
      ),
      
      // Sell section
      html.div({ class: 'section' },
        html.div({ class: 'section-title' }, '📤 Sell (cheap)'),
        html.div({ class: 'trade-row' },
          html.select({ class: 'trade-select', change: (e) => { state.sellResource = e.target.value; } },
            ...Object.keys(TRADE_RATES).map(res => 
              html.option({ value: res, selected: state.sellResource === res }, 
                `${RESOURCE_ICONS[res]} ${res}`
              )
            )
          ),
          html.input({ 
            class: 'trade-input', 
            type: 'number', 
            min: '1', 
            max: '10',
            value: state.sellAmount,
            change: (e) => { state.sellAmount = Math.max(1, Math.min(10, parseInt(e.target.value) || 1)); }
          }),
          html.button({ 
            class: 'trade-btn',
            click: () => {
              const gs = gameStore.getState().gameState;
              const player = gs.players[gs.currentPlayer];
              const have = player.resources[state.sellResource] || 0;
              if (have >= state.sellAmount) {
                const gain = TRADE_RATES[state.sellResource].sell * state.sellAmount;
                player.resources[state.sellResource] -= state.sellAmount;
                player.resources.gold += gain;
                gameStore.setState({ gameState: gs });
                gameStore.addNotification(`Sold ${state.sellAmount} ${state.sellResource} for ${gain} gold`, 'success');
              } else {
                gameStore.addNotification(`Not enough ${state.sellResource}!`, 'error');
              }
            }
          }, 'Sell'),
          html.button({ 
            class: 'trade-btn',
            style: 'background: #22c55e;',
            title: 'Set up recurring sell order',
            click: () => {
              const gs = gameStore.getState().gameState;
              const player = gs.players[gs.currentPlayer];
              player.marketOrders = player.marketOrders || [];
              player.marketOrders.push({
                type: 'sell',
                resource: state.sellResource,
                amount: state.sellAmount
              });
              gameStore.setState({ gameState: gs });
              gameStore.addNotification(`Set up recurring sell: ${state.sellAmount} ${state.sellResource}/turn`, 'success');
            }
          }, '🔄')
        ),
        (() => {
          const gain = TRADE_RATES[state.sellResource]?.sell * state.sellAmount;
          return html.div({ class: 'cost' }, 
            'Gain: ', 
            html.span({ class: 'cost-value' }, `${gain} 🪙`),
            html.span({ style: 'color: #a09070; margin-left: 0.5rem; font-size: 0.75rem;' }, '(🔄 = recurring)')
          );
        })()
      )
    ) : null,
    
    // Agreements tab - player trade
    state.tab === 'agreements' ? html.div({ class: 'agreements' },
      // Active agreements
      html.div({ class: 'section' },
        html.div({ class: 'section-title' }, '📜 Active Agreements'),
        (() => {
          const gs = gameStore.getState().gameState;
          const player = gs?.players[gs.currentPlayer];
          const agreements = player?.tradeAgreements || [];
          
          if (agreements.length === 0) {
            return html.div({ class: 'no-agreements' }, 'No active trade agreements');
          }
          
          return agreements.map((agreement, index) => {
            const partner = gs.players.find(p => p.id === agreement.partnerId);
            const duration = agreement.duration || 0;
            const bonus = Math.min(50, duration * 5); // 5% per turn, max 50%
            const failures = agreement.failedTurns || 0;
            
            return html.div({ class: `agreement ${failures > 0 ? 'agreement-warning' : ''}`, style: failures > 0 ? 'border-color: #ef4444;' : '' },
              html.div({ class: 'agreement-header' },
                html.span({ class: 'agreement-partner' }, `Trade with ${partner?.name || 'Unknown'}`),
                html.button({ 
                  class: 'trade-btn cancel',
                  click: () => {
                    // Cancel agreement for both parties
                    player.tradeAgreements = player.tradeAgreements.filter((_, i) => i !== index);
                    if (partner) {
                      partner.tradeAgreements = (partner.tradeAgreements || []).filter(
                        a => a.partnerId !== player.id
                      );
                    }
                    gameStore.setState({ gameState: gs });
                    gameStore.addNotification('Trade agreement cancelled', 'info');
                  }
                }, '✕')
              ),
              html.div({ class: 'agreement-details' },
                html.span({ class: 'agreement-give' }, 
                  `Give: ${agreement.give.amount} ${RESOURCE_ICONS[agreement.give.resource]} `
                ),
                html.span({ class: 'agreement-receive' }, 
                  `Receive: ${agreement.receive.amount} ${RESOURCE_ICONS[agreement.receive.resource]}`
                ),
                bonus > 0 ? html.span({ style: 'color: #22c55e; margin-left: 0.5rem;' }, `(+${bonus}% bonus)`) : null
              ),
              html.div({ style: 'font-size: 0.7rem; margin-top: 0.25rem; display: flex; gap: 0.5rem;' },
                html.span({ style: 'color: #a09070;' }, `Duration: ${duration} turns`),
                failures > 0 ? html.span({ style: 'color: #ef4444;' }, `⚠️ ${failures}/3 failures`) : null
              )
            );
          });
        })()
      ),
      
      // Create new agreement
      html.div({ class: 'section' },
        html.div({ class: 'section-title' }, '➕ New Agreement'),
        // Select partner
        html.div({ class: 'section-title', style: 'margin-top: 0.5rem;' }, 'Trade with:'),
        (() => {
          const gs = gameStore.getState().gameState;
          const currentPlayerId = gs?.players[gs.currentPlayer]?.id;
          const otherPlayers = gs?.players.filter(p => p.id !== currentPlayerId) || [];
          
          return otherPlayers.map(p => 
            html.div({ 
              class: `player-option ${state.tradePartner === p.id ? 'selected' : ''}`,
              click: () => { state.tradePartner = p.id; }
            },
              html.div({ class: 'player-color', style: `background: ${p.color};` }),
              html.span({ class: 'player-name' }, p.name)
            )
          );
        })(),
        
        state.tradePartner ? html.div({ style: 'margin-top: 0.75rem;' },
          // What you offer
          html.div({ class: 'trade-row' },
            html.span({ style: 'color: #ef4444; font-size: 0.8rem; width: 40px;' }, 'Give:'),
            html.input({ 
              class: 'trade-input', 
              type: 'number', 
              min: '1', 
              max: '5',
              value: state.offerAmount,
              change: (e) => { state.offerAmount = Math.max(1, Math.min(5, parseInt(e.target.value) || 1)); }
            }),
            html.select({ class: 'trade-select', change: (e) => { state.offerResource = e.target.value; } },
              ...Object.keys(TRADE_RATES).map(res => 
                html.option({ value: res, selected: state.offerResource === res }, 
                  `${RESOURCE_ICONS[res]} ${res}`
                )
              )
            )
          ),
          // What you request
          html.div({ class: 'trade-row' },
            html.span({ style: 'color: #22c55e; font-size: 0.8rem; width: 40px;' }, 'Get:'),
            html.input({ 
              class: 'trade-input', 
              type: 'number', 
              min: '1', 
              max: '5',
              value: state.requestAmount,
              change: (e) => { state.requestAmount = Math.max(1, Math.min(5, parseInt(e.target.value) || 1)); }
            }),
            html.select({ class: 'trade-select', change: (e) => { state.requestResource = e.target.value; } },
              ...Object.keys(TRADE_RATES).map(res => 
                html.option({ value: res, selected: state.requestResource === res }, 
                  `${RESOURCE_ICONS[res]} ${res}`
                )
              )
            )
          ),
          html.button({ 
            class: 'trade-btn',
            style: 'width: 100%; margin-top: 0.5rem;',
            click: () => {
              const gs = gameStore.getState().gameState;
              const player = gs.players[gs.currentPlayer];
              const partner = gs.players.find(p => p.id === state.tradePartner);
              
              if (!partner) {
                gameStore.addNotification('Select a trade partner', 'error');
                return;
              }
              
              // Check if already have agreement with this partner
              if (player.tradeAgreements?.some(a => a.partnerId === partner.id)) {
                gameStore.addNotification('Already have agreement with this player', 'error');
                return;
              }
              
              // Create reciprocal agreements
              player.tradeAgreements = player.tradeAgreements || [];
              partner.tradeAgreements = partner.tradeAgreements || [];
              
              player.tradeAgreements.push({
                partnerId: partner.id,
                give: { resource: state.offerResource, amount: state.offerAmount },
                receive: { resource: state.requestResource, amount: state.requestAmount }
              });
              
              partner.tradeAgreements.push({
                partnerId: player.id,
                give: { resource: state.requestResource, amount: state.requestAmount },
                receive: { resource: state.offerResource, amount: state.offerAmount }
              });
              
              gameStore.setState({ gameState: gs });
              gameStore.addNotification(`Trade agreement with ${partner.name} established!`, 'success');
              state.tradePartner = null;
            }
          }, '🤝 Propose Trade')
        ) : null
      )
    ) : null
  ) : null
]);

// ============================================================================
// VICTORY SCREEN
// ============================================================================

pfusch("victory-screen", { winner: '' }, (state) => [
  css`
    :host { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    .box { background: rgba(42, 24, 16, 0.95); border: 3px solid #c9a227; padding: 3rem; text-align: center; border-radius: 8px; }
    .trophy { font-size: 4rem; }
    .title { font-size: 2rem; color: #c9a227; margin: 1rem 0; }
    .btn { padding: 1rem 2rem; background: #c9a227; color: #2a1810; border: none; cursor: pointer; border-radius: 4px; }
  `,
  script(function() {
    window.addEventListener('game-store.updated', (e) => {
      const gs = e.detail.gameState;
      if (gs?.winner) {
        const w = gs.players.find(p => p.id === gs.winner);
        this.state.winner = w?.name || 'Unknown';
      }
    });
  }),
  html.div({ class: 'box' },
    html.div({ class: 'trophy' }, '🏆'),
    html.h1({ class: 'title' }, 'Victory!'),
    html.p(`${state.winner} wins!`),
    html.button({ class: 'btn', click: () => gameStore.setState({ phase: 'MENU', gameState: null }) }, '🏠 Menu')
  )
]);

console.log('[The Mill] Game loaded');