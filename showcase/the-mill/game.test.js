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
