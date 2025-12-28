# Civilization Wars 🏰

A turn-based civilization breeding game built as a **Pfusch** framework showcase. Features Conway's Game of Life mechanics combined with D&D-style stats for strategic depth.

## Features

### Core Gameplay
- **Breeding System**: Cells reproduce based on Conway's Game of Life rules (exactly 3 neighbors = birth)
- **D&D Stats**: Each cell has STR, CON, DEX, CHR, WIS, INT (3d6 distribution)
- **Strategic Trade-off**: Higher total stats = stronger in combat but lower breeding chance
- **Multi-generational Evolution**: Stats are inherited with mutation

### Multiplayer
- **2-8 Human Players**: Take turns placing cells and strategizing
- **NPC Civilizations**: AI-controlled opponents with different strategies:
  - **Aggressive**: High STR, targets enemy cells
  - **Defensive**: High CON, builds dense clusters
  - **Expansionist**: Lower stats, spreads quickly
  - **Elite**: Fewer but powerful cells
  - **Balanced**: Mixed approach

### Battle System
Combat power is calculated as:
```
Power = STR×0.30 + CON×0.20 + DEX×0.25 + WIS×0.15 + INT×0.10 + d6
```
- CON provides defensive bonus
- Numbers advantage for multiple attackers
- Winner survives, loser dies

### Breeding Mechanics
- Offspring inherit stats from 2 parent neighbors
- 15% mutation chance per stat (±2 points)
- Breeding chance: `40% - (totalStats/180)`
- High-stat elites breed slowly but dominate in combat
- Low-stat masses breed quickly but die easily

### Email-Based Play
1. Click "Export Game" to download JSON save file
2. Email the save file to the next player
3. They load it via the setup screen
4. Continue playing from where you left off

## Technical Highlights

This showcase demonstrates several Pfusch patterns for **high-performance** applications:

### Canvas Rendering
Instead of DOM elements for each cell (which would be 10,000+ elements on a 100×100 grid), we use a single `<canvas>` for:
- O(n) rendering instead of O(n²) DOM operations
- 60fps animation loop via `requestAnimationFrame`
- Pixel-perfect cell rendering with cute faces

### Event-Driven Architecture
Components communicate via window events:
```javascript
// Publisher
window.dispatchEvent(new CustomEvent('game.stateChanged'));

// Subscriber
window.addEventListener('game.stateChanged', () => {
    state.generation = window.gameEngine.generation;
});
```

### State Management
- Game engine is a singleton on `window.gameEngine`
- Components reactively update when `game.stateChanged` fires
- Sparse grid encoding for efficient JSON export

### Offline Support
Service Worker caches all assets for offline play:
```javascript
navigator.serviceWorker.register('./sw.js');
```

### Performance Optimizations
- Grid stored as 2D array for O(1) cell lookup
- Neighbor calculations reuse coordinate arrays
- Batch DOM updates via Pfusch's reactive system
- Minimal re-renders using component-level state

## Running Locally

1. Serve the pfusch repository root (needed for module imports):
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```

2. Open `http://localhost:8080/showcase/civilization-wars/`

3. Configure players and grid size, then click Start!

## Strategic Placement Guide

### Offensive Strategies

**Aggressive Expansion**
- Place high-STR cells (15+) along borders facing enemies
- Use DEX-focused cells (15+) for quick strikes and encirclement
- Create attacking "spears" extending toward enemy territory
- Power formula heavily favors STR (30%) + DEX (25%), so stack both stats
- Each additional attacker adds +1 power—numbers matter in coordinated attacks
- Risk: High-stat cells breed slowly (40% - totalStats/240), so you'll have fewer units to sustain losses

**Penetrating Wedges**
- Place 3-5 high-DEX cells in an arrow formation toward enemy clusters
- DEX influences combat power (25%) and helps younger, faster-breeding units
- Once you breach enemy territory, place lower-stat cells behind to hold ground
- Leverage age advantage: young cells (age < 50) gain +25% power multiplier
- Replace frontline losses immediately—don't let gaps form

**Ranged Softening**
- Focus breeding bias on INT/WIS to create special "mage" units (costs no special resources)
- INT (10%) and WIS (15%) contribute to power, totaling 25%—same as pure DEX
- Use these to fight from protected positions; they don't need high STR
- Pair with high-CON defenders (see Defensive Strategies below)

### Defensive Strategies

**Fortress Clustering**
- Pack cells densely in a core 3×3 or 4×4 area with 2-3 neighbors each
- Cells need 1-5 neighbors to survive (die below 1 or above 5); density is safe
- CON provides 20% of combat power—breed high-CON units for durability
- Layer formations: inner core (high CON, age 10+), outer ring (fresh units for breeding)
- Bonus: Dense clusters trigger Conway's Game of Life births naturally—free reinforcements

**Layered Defense with Breeding**
- Create inner "garrison" (high CON, older) and outer "militia" (lower stats, young)
- Young cells peak at +25% power multiplier (age < 50)—use them as disposable frontline
- Lower-stat cells breed faster (40% - totalStats/240)—outer ring self-replenishes
- Replace losses from the inner core into outer ring gaps
- Against rush attacks, sacrifice outer militia to buy time for inner core reinforcement

**CHR/WIS Diplomatic Defense**
- CHR doesn't affect combat directly, but focus breeding on CON + WIS (25% power)
- WIS (15%) helps with survival and tactical positioning
- Reserve some placements for utility: bridge gaps, reinforce thin borders
- Can survive longer wars of attrition if you control breeding better than attackers

### Breeding Placement Strategies

**Breeding Ground Optimization**
- Place lower-stat cells (total < 50) away from combat zones
- Low-stat cells breed at ~60% rate; high-stat units at ~30% or less
- Dedicate a 5×5 "nursery" section with exactly 2-3 neighbors per cell
- Inherit stats from two parents: breed your strongest units adjacent to ensure elite offspring
- Mutate strategically: 15% mutation chance with ±2 variance means elder cells create variation

**Stat-Focused Breeding Lines**
- Create separate zones for different stat focuses (STR zone, CON zone, DEX zone)
- When cells breed with adjacent neighbors, stats inherit from parents (80% chance) or average (20%)
- Stack breeding bias: focus 3-5 generations on one stat to compound gains
- Combine focused lines: DEX-heavy border cells, STR-heavy assault waves, CON-heavy garrisons

**Field-Augmented Growth**
- Position cells adjacent to **Fertility Shrine** (boosts breeding 20% for 5 turns)
- Use **Warforge Obelisk** to boost STR/DEX for immediate offensive units
- Use **Ironbark Grove** for CON/WIS to build durable defenses
- Use **Silver Tongue Plaza**, **Oracle Pool**, **Arcane Lens** to create hybrid specialties
- Time field activation: activate when your breeding is peaking (turn 3-5 after expansion)

**Mutation Exploitation**
- Breed at edges: outer cells touching different player colors create mutation pressure
- Every generation, 15% of stats mutate ±2 points—high-stat elites can drift downward
- Cull aging units (100+ turns, 5% death chance per turn) before they become liabilities
- Keep cells at age 10-50 range for optimal power (75-100% multiplier) + breeding

### Hybrid Strategies

**Aggressive Expansion with Breeding Buffer**
- Front line: high-STR/DEX attacking cells (breed slowly but dominate)
- Middle: mixed-stat units anchoring territory, moderate breeding
- Rear: low-stat breeding pool (breed fast, supply losses)
- Placement order: rear first to secure breeding, then expand from front
- Requires 20+ cells to be sustainable; start with **STARTING_CELLS: 25**

**Defensive Perimeter with Counter-Strike**
- Build dense core fortress (high CON) with 2-3 defended neighbors
- Reserve 30% of placements for a mobile strike force adjacent to core
- Strike force: balanced stats (10-12 each), young (age < 30), high mutation potential
- When enemy attacks, sacrifice outer ring; if enemy overextends, deploy strike force

**Map Control & Field Hacking**
- Identify special fields early (Fertility Shrine, Warforge, etc.)
- Rush toward beneficial fields with expendable low-stat units
- Once claimed, fortify with high-stat defenders—holding a Shrine is worth 5-10 cells
- Position breeding zones adjacent to fields to amplify growth
- Conversely, contaminate enemy breeding grounds with Plague Bog

## Game Rules Summary

1. **Placement Phase**: Each player can place up to 10 cells per turn adjacent to their existing cells
2. **End Turn**: Click to end your turn; when all players have gone, a generation simulates
3. **Simulation**:
   - Cells age and may die of old age (>50 generations, 10% per turn)
   - Cells with 2-3 same-civilization neighbors survive
   - Cells with <2 or >3 same-civ neighbors die
   - Adjacent enemy cells battle
   - Empty spaces with exactly 3 neighbors may spawn new cells
4. **Victory**: Eliminate all other civilizations!

## License

Part of the Pfusch project - MIT License
