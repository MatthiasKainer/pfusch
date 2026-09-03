// animation.test.js - lifecycle attrs (keep / mount / unmount / exit) and the animation stubs
import assert from 'node:assert/strict';
import test from 'node:test';
import { createFakeAnimation, setupDomStubs } from './pfusch-stubs.js';

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
