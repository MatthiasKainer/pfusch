// game.test.js - Tests for The Mill game
import assert from 'node:assert/strict';
import test from 'node:test';
import { pfusch, html, script, toElement } from '../pfusch.js';
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

test('pfusch defers script until light DOM children are ready', async () => {
  let formCount = -1;

  pfusch('test-late-children', {}, (state, trigger, { children }) => [
    script(function() {
      formCount = children('form').length;
    }),
    html.slot()
  ]);

  const el = document.createElement('test-late-children');
  document.body.appendChild(el);

  const form = document.createElement('form');
  el.appendChild(form);

  await new Promise(r => setTimeout(r, 0));
  assert.equal(formCount, 1, 'Script should see light DOM children that arrive right after connect');
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

test('dom stubs support descendant selectors', () => {
  const header = document.createElement('section');
  header.className = 'dashboard-header';
  const title = document.createElement('h1');
  title.textContent = 'Dashboard';
  header.appendChild(title);
  document.body.appendChild(header);

  const results = document.body.querySelectorAll('.dashboard-header h1');
  assert.equal(results.length, 1);
  assert.equal(results[0], title);
  assert.equal(title.matches('.dashboard-header h1'), true);

  header.remove();
});

test('dom stubs handle bubbling native Event objects at window level', () => {
  const target = document.createElement('div');
  let called = false;
  const handler = () => {
    called = true;
  };

  window.addEventListener('native-bubble', handler);
  assert.doesNotThrow(() => {
    target.dispatchEvent(new Event('native-bubble', { bubbles: true }));
  });
  window.removeEventListener('native-bubble', handler);

  assert.equal(called, true);
});

test('pfusch reuses DOM nodes on re-render (no re-insertion)', async () => {
  pfusch('test-reuse', { count: 0 }, (state) => [
    html.div({ class: 'item', 'data-count': String(state.count) }, `Count: ${state.count}`)
  ]);

  const el = document.createElement('test-reuse');
  document.body.appendChild(el);
  el.connectedCallback();

  const firstDiv = el.shadowRoot.querySelector('.item');
  assert.ok(firstDiv, 'Element should exist after first render');

  el.state.count = 1;
  await new Promise(r => setTimeout(r, 0));

  const secondDiv = el.shadowRoot.querySelector('.item');
  assert.strictEqual(firstDiv, secondDiv, 'Same DOM node should be reused, not re-inserted');
  assert.equal(secondDiv.getAttribute('data-count'), '1', 'Attribute should be updated in-place');
});

test('pfusch reuses custom element children on re-render', async () => {
  pfusch('test-custom-child', { label: 'a' }, (state) => [
    html['test-inner-el']({ label: state.label })
  ]);

  const el = document.createElement('test-custom-child');
  document.body.appendChild(el);
  el.connectedCallback();

  const first = el.shadowRoot.querySelector('test-inner-el');
  assert.ok(first, 'Custom child should exist');

  el.state.label = 'b';
  await new Promise(r => setTimeout(r, 0));

  const second = el.shadowRoot.querySelector('test-inner-el');
  assert.strictEqual(first, second, 'Custom element should be patched in-place, not re-inserted');
  assert.equal(second.getAttribute('label'), 'b', 'Attribute should be updated');
});

test('html element getter allows setting innerHTML via descriptor', () => {
  pfusch('test-desc-html', { content: '<b>hello</b>' }, (state) => {
    const container = html.div({ class: 'raw-content' });
    container.element.innerHTML = state.content;
    return [container];
  });

  const el = document.createElement('test-desc-html');
  document.body.appendChild(el);
  el.connectedCallback();

  const div = el.shadowRoot.querySelector('.raw-content');
  assert.ok(div, 'Container should exist');
  assert.ok(div.innerHTML.includes('hello'), 'innerHTML should be set via .element.innerHTML setter');
});

test('toElement converts a descriptor to a real DOM element', () => {
  const desc = html.div({ class: 'card', 'data-x': '1' }, 'hello');
  const el = toElement(desc);
  assert.equal(el.tagName, 'DIV');
  assert.equal(el.getAttribute('class'), 'card');
  assert.equal(el.getAttribute('data-x'), '1');
  assert.equal(el.textContent, 'hello');
});

test('toElement materializes nested descriptors recursively', () => {
  const desc = html.ul(html.li('a'), html.li('b'));
  const el = toElement(desc);
  assert.equal(el.tagName, 'UL');
  assert.equal(el.querySelectorAll('li').length, 2);
  assert.equal(el.querySelectorAll('li')[0].textContent, 'a');
  assert.equal(el.querySelectorAll('li')[1].textContent, 'b');
});

test('toElement skips null/undefined attributes', () => {
  const desc = html.span({ title: null, 'aria-label': undefined, id: 'x' });
  const el = toElement(desc);
  assert.equal(el.hasAttribute('title'), false);
  assert.equal(el.hasAttribute('aria-label'), false);
  assert.equal(el.getAttribute('id'), 'x');
});

test('toElement sets innerHTML when _html is present', () => {
  const desc = html.div();
  desc._html = '<b>bold</b>';
  const el = toElement(desc);
  assert.ok(el.innerHTML.includes('bold'));
});

test('dom stubs set submit event target for native Event instances', () => {
  const form = document.createElement('form');
  const input = document.createElement('input');
  form.appendChild(input);

  let queried = null;
  form.addEventListener('submit', (e) => {
    queried = e.target.querySelector('input');
  });

  assert.doesNotThrow(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  assert.equal(queried, input);
});
