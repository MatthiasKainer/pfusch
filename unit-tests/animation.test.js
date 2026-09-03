// animation.test.js - lifecycle attrs (keep / mount / unmount / exit) and the animation stubs
import assert from 'node:assert/strict';
import test from 'node:test';
import { pfusch, html } from '../pfusch.js';
import { createFakeAnimation, pfuschTest, setupDomStubs } from './pfusch-stubs.js';

let restore;

test.before(() => {
  ({ restore } = setupDomStubs());
});

test.after(() => {
  restore?.();
});

// ============================================================================
// Animation stubs (createFakeAnimation / animate / getAnimations / matchMedia)
// ============================================================================

test('animate() returns a pending animation and registers it on the element', () => {
  const el = document.createElement('div');
  const animation = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 });

  assert.equal(animation.pending, true);
  assert.equal(animation.playState, 'running');
  assert.deepEqual(el.getAnimations(), [animation]);
});

test('animation.finished resolves on finish()', async () => {
  const el = document.createElement('div');
  const animation = el.animate([], { duration: 200 });

  animation.finish();
  await animation.finished;

  assert.equal(animation.pending, false);
  assert.equal(animation.playState, 'finished');
});

test('animation.finished settles on cancel() without an unhandled rejection', async () => {
  const el = document.createElement('div');
  const animation = el.animate([], { duration: 200 });

  animation.cancel();
  const [settled] = await Promise.allSettled([animation.finished]);

  assert.equal(settled.status, 'rejected');
  assert.equal(animation.playState, 'idle');
});

test('createFakeAnimation can model an already-running, non-pending animation', () => {
  const animation = createFakeAnimation({ pending: false });

  assert.equal(animation.pending, false);
  assert.equal(typeof animation.finished.then, 'function');
});

test('getAnimations({ subtree: true }) collects descendant animations', () => {
  const parent = document.createElement('div');
  const child = document.createElement('span');
  const grandchild = document.createElement('b');
  parent.appendChild(child);
  child.appendChild(grandchild);

  const own = parent.animate([], { duration: 1 });
  const deep = grandchild.animate([], { duration: 1 });

  assert.deepEqual(parent.getAnimations(), [own]);
  assert.deepEqual(parent.getAnimations({ subtree: true }), [own, deep]);
});

test('matchMedia stub supports addEventListener/removeEventListener', () => {
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  const listener = () => { };

  assert.equal(query.matches, false);
  assert.doesNotThrow(() => query.addEventListener('change', listener));
  assert.doesNotThrow(() => query.removeEventListener('change', listener));
});

// ============================================================================
// keep: the template owns the node, the author owns its children
// ============================================================================

// The fake DOM tracks appendChild()-created children but treats innerHTML as an
// opaque string, so these tests grow the "engine" subtree with appendChild.
const appendIcon = (e) => e.target.appendChild(document.createElement('i'));

test('keep leaves author-owned children alone while attrs still sync', async () => {
  pfusch('keep-host', { label: 'plan' }, (state) => [
    html.span({ id: 'icon', keep: true, 'aria-label': state.label, mount: appendIcon })
  ]);

  const host = pfuschTest('keep-host');
  await host.flush();
  const icon = host.get('#icon').elements[0];

  assert.equal(icon.children.length, 1);
  assert.equal(icon.getAttribute('keep'), 'true', 'keep stays queryable as [keep] in CSS');

  host.host.state.label = 'run';
  await host.flush();

  assert.equal(host.get('#icon').elements[0], icon, 'the node is patched, not replaced');
  assert.equal(icon.getAttribute('aria-label'), 'run', 'attrs still belong to the template');
  assert.equal(icon.children.length, 1, 'children survive the rerender');
});

test('without keep an empty descriptor still clears the node', async () => {
  pfusch('nokeep-host', { label: 'plan' }, (state) => [
    html.span({ id: 'icon', 'aria-label': state.label, mount: appendIcon })
  ]);

  const host = pfuschTest('nokeep-host');
  await host.flush();
  const icon = host.get('#icon').elements[0];
  assert.equal(icon.children.length, 1);

  host.host.state.label = 'run';
  await host.flush();

  assert.equal(icon.children.length, 0, 'the empty-descriptor clear is unchanged without keep');
});

// ============================================================================
// mount
// ============================================================================

test('mount fires once no matter how often the node is patched', async () => {
  let mounts = 0;
  pfusch('mount-once', { n: 0 }, (state) => [
    html.div({ id: 'box', 'data-n': state.n, mount: () => { mounts++; } })
  ]);

  const host = pfuschTest('mount-once');
  await host.flush();
  for (const n of [1, 2, 3]) {
    host.host.state.n = n;
    await host.flush();
  }

  assert.equal(host.get('#box').elements[0].getAttribute('data-n'), '3');
  assert.equal(mounts, 1);
});

test('mount fires for nested descriptors too', async () => {
  let mounts = 0;
  pfusch('mount-nested', {}, () => [
    html.div({ id: 'outer' }, html.span({ id: 'inner', mount: () => { mounts++; } }))
  ]);

  const host = pfuschTest('mount-nested');
  await host.flush();

  assert.equal(mounts, 1);
  assert.equal(host.get('#inner').length, 1);
});

test('mount fires again when a tag change forces a fresh node', async () => {
  let mounts = 0;
  pfusch('mount-tagswap', { tag: 'span' }, (state) => [
    html.div({ id: 'wrap' }, html[state.tag]({ id: 'swap', mount: () => { mounts++; } }))
  ]);

  const host = pfuschTest('mount-tagswap');
  await host.flush();
  assert.equal(mounts, 1);

  host.host.state.tag = 'b';
  await host.flush();

  assert.equal(host.get('#swap').elements[0].tagName, 'B');
  assert.equal(mounts, 2, 'the replacement node is a new node, so it mounts');
});

test('mount fires the first time pfusch adopts a hydrated node', async () => {
  let mounts = 0;
  pfusch('mount-hydrated', {}, () => [
    html.span({ id: 'icon', mount: () => { mounts++; } })
  ]);

  // as="lazy" defers the first render, which lets the test put server-rendered
  // markup in the shadow root before pfusch ever looks at it.
  const host = pfuschTest('mount-hydrated', { as: 'lazy' });
  const hydrated = document.createElement('span');
  hydrated.setAttribute('id', 'icon');
  host.host.shadowRoot.appendChild(hydrated);
  assert.equal(mounts, 0);

  host.host.removeAttribute('as');
  await host.flush();

  assert.equal(mounts, 1);
  assert.equal(host.host.shadowRoot.children[0], hydrated, 'the hydrated node is adopted, not rebuilt');
});

// ============================================================================
// unmount
// ============================================================================

test('unmount fires once when the differ drops the node', async () => {
  let unmounts = 0;
  pfusch('unmount-host', { show: true }, (state) => [
    state.show ? html.div({ id: 'panel', unmount: () => { unmounts++; } }) : null
  ]);

  const host = pfuschTest('unmount-host');
  await host.flush();
  assert.equal(host.get('#panel').length, 1);

  host.host.state.show = false;
  await host.flush();
  assert.equal(host.get('#panel').length, 0);
  assert.equal(unmounts, 1);

  host.host.state.show = false;
  await host.flush();
  assert.equal(unmounts, 1, 'no second unmount for an already-removed node');
});

test('mount/unmount drive an imperative engine over a kept node', async () => {
  const log = [];

  class FakeEngine {
    constructor(host, { state }) {
      this.host = host;
      this.current = state;
      host.appendChild(document.createElement('i'));
      log.push(`init:${state}`);
    }
    set(next) {
      if (next === this.current) return;
      this.current = next;
      log.push(`set:${next}`);
    }
    destroy() { log.push('destroy'); }
  }

  pfusch('engine-host', { step: 'plan', show: true }, (state) => [
    state.show ? html.span({
      id: 'icon',
      keep: true,
      mount(e) {
        const engine = e.target._engine = new FakeEngine(e.target, { state: state.step });
        e.target._off = state.subscribe('step', (next) => engine.set(next));
      },
      unmount(e) {
        e.target._off();
        e.target._engine.destroy();
      }
    }) : null
  ]);

  const host = pfuschTest('engine-host');
  await host.flush();
  assert.deepEqual(log, ['init:plan']);

  host.host.state.step = 'run';
  await host.flush();
  assert.deepEqual(log, ['init:plan', 'set:run']);

  host.host.state.step = 'run';
  await host.flush();
  assert.deepEqual(log, ['init:plan', 'set:run'], 'set(same) is a no-op');

  host.host.state.show = false;
  await host.flush();
  assert.deepEqual(log, ['init:plan', 'set:run', 'destroy']);
});

// ============================================================================
// keyed reuse: the nested fast path used to match on position + tag only
// ============================================================================

test('a keyed [a,b] -> [a,c] change builds a fresh node for c', async () => {
  pfusch('keyed-list', { items: ['a', 'b'] }, (state) => [
    html.div({ id: 'list' }, ...state.items.map(i => html.span({ id: `item-${i}` }, i)))
  ]);

  const host = pfuschTest('keyed-list');
  await host.flush();
  const list = host.get('#list').elements[0];
  const [firstBefore, secondBefore] = list.children;

  host.host.state.items = ['a', 'c'];
  await host.flush();
  const [firstAfter, secondAfter] = list.children;

  assert.equal(firstAfter, firstBefore, 'the matching id is reused');
  assert.notEqual(secondAfter, secondBefore, "b's node must not be recycled as c");
  assert.equal(secondAfter.id, 'item-c');
  assert.equal(secondAfter.textContent, 'c');
});

test('unkeyed children still get reused positionally', async () => {
  pfusch('unkeyed-list', { items: ['a', 'b'] }, (state) => [
    html.div({ id: 'list' }, ...state.items.map(i => html.span(i)))
  ]);

  const host = pfuschTest('unkeyed-list');
  await host.flush();
  const list = host.get('#list').elements[0];
  const secondBefore = list.children[1];

  host.host.state.items = ['a', 'c'];
  await host.flush();

  assert.equal(list.children[1], secondBefore, 'no id means position keeps the node');
  assert.equal(list.children[1].textContent, 'c');
});
