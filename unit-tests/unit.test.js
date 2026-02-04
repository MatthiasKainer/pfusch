// game.test.js - Tests for The Mill game
import assert from 'node:assert/strict';
import test from 'node:test';
import { pfusch, html, script } from '../pfusch.js';
import { setupDomStubs, pfuschTest } from './pfusch-stubs.js';

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

test('pfusch handles camelCase attributes', async () => {
    pfusch('test-camel', { camelCase: 'initial' }, (state) => [
        html.div(state.camelCase)
    ]);
    
    const el = document.createElement('test-camel');
    el.setAttribute('camelcase', 'parsed');
    document.body.appendChild(el);
    el.connectedCallback();
    
    assert.equal(el.state.camelCase, 'parsed');

    el.setAttribute('camelCase', 'updated');
    assert.equal(el.state.camelCase, 'updated');
    
    el.setAttribute('camelcase', 'lowercase');
    assert.equal(el.state.camelCase, 'lowercase');
});

test('pfusch handles kebab-case attributes', async () => {
    pfusch('test-kebab', { kebabCase: 'initial' }, (state) => [
        html.div(state.kebabCase)
    ]);
    
    const el = document.createElement('test-kebab');
    el.setAttribute('kebab-case', 'start');
    
    document.body.appendChild(el);
    el.connectedCallback();
    
    assert.equal(el.state.kebabCase, 'start', 'Should initialize from kebab-case attribute');

    el.setAttribute('kebab-case', 'changed');
    assert.equal(el.state.kebabCase, 'changed', 'Should update state when kebab-case attribute changes');
});
