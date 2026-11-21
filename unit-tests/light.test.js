// light.test.js - light-DOM components: pfusch(tag, state, template, { shadow: false })
import assert from 'node:assert/strict';
import test from 'node:test';
import { pfusch, html, css, script } from '../pfusch.js';
import { flushEffects, pfuschTest, setupDomStubs } from './pfusch-stubs.js';

let restore;

test.before(() => {
  ({ restore } = setupDomStubs());
});

test.after(() => {
  restore?.();
});

test('a light component renders into the element itself, without a shadow root', async () => {
  pfusch('light-hello', { name: 'Ada' }, (state) => [html.p({ class: 'greeting' }, `Hello ${state.name}`)], { shadow: false });
  const widget = pfuschTest('light-hello');
  await flushEffects();
  const host = widget.host;
  assert.ok(!host.shadowRoot);
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].textContent, 'Hello Ada');
  assert.equal(widget.get('.greeting').textContent, 'Hello Ada');
});

test('a light component diffs its own children: the same node is kept and patched', async () => {
  pfusch('light-counter', { count: 0 }, (state) => [html.span({ class: 'count' }, String(state.count))], { shadow: false });
  const widget = pfuschTest('light-counter');
  await flushEffects();
  const before = widget.host.querySelector('.count');
  widget.host.state.count = 3;
  await flushEffects();
  const after = widget.host.querySelector('.count');
  assert.equal(after, before, 'the node is patched, not replaced');
  assert.equal(after.textContent, '3');
});

test('the template-only signature takes options too', async () => {
  pfusch('light-bare', () => [html.b('bold')], { shadow: false });
  const widget = pfuschTest('light-bare');
  await flushEffects();
  assert.ok(!widget.host.shadowRoot);
  assert.equal(widget.host.querySelector('b').textContent, 'bold');
});

test('a light component replaces markup written inside it: it owns its children, no slots or children()', async () => {
  let seen = null;
  pfusch('light-owner', (state, trigger, { children }) => {
    seen = children().length;
    return [html.em('mine')];
  }, { shadow: false });
  const host = document.createElement('light-owner');
  host.appendChild(document.createElement('u'));
  document.body.appendChild(host);
  await flushEffects();
  assert.equal(seen, 0);
  assert.deepEqual(Array.from(host.children).map((child) => child.tagName), ['EM']);
});

test('a parent template never clears a light child it renders, while the child attrs still sync', async () => {
  pfusch('light-row', { label: '' }, (state) => [html.span({ class: 'label' }, state.label)], { shadow: false });
  pfusch('light-list', { label: 'one', tick: 0 }, (state) => [
    html.div({ class: 'wrap', 'data-tick': state.tick }, html['light-row']({ label: state.label })),
  ]);
  const list = pfuschTest('light-list');
  await flushEffects();
  const row = list.host.shadowRoot.querySelector('light-row');
  assert.equal(row.querySelector('.label').textContent, 'one');
  const label = row.querySelector('.label');
  list.host.state.tick = 1;
  await flushEffects();
  assert.equal(list.host.shadowRoot.querySelector('light-row'), row, 'the row element is kept');
  assert.equal(row.querySelector('.label'), label, 'the parent rerender left the row children alone');
  list.host.state.label = 'two';
  await flushEffects();
  assert.equal(row.querySelector('.label').textContent, 'two', 'the attribute reached the row, which rendered itself');
});

test('a light component adopts its css into the tree it sits in, once', async () => {
  const sheet = css`.light-styled { color: red; }`;
  pfusch('light-styled', { n: 0 }, (state) => [sheet, html.i({ class: 'light-styled' }, String(state.n))], { shadow: false });
  pfusch('light-styled-host', () => [html['light-styled']()]);
  const host = pfuschTest('light-styled-host').host;
  await flushEffects();
  const child = host.shadowRoot.querySelector('light-styled');
  child.state.n = 1;
  await flushEffects();
  const adopted = host.shadowRoot.adoptedStyleSheets.filter((each) => each === sheet.content());
  assert.equal(adopted.length, 1);
});

test('script() in a light component queries the element itself', async () => {
  let query = null;
  let shadow;
  pfusch('light-script', () => [
    html.input({ class: 'field' }),
    script(function () {
      query = this.querySelector;
      shadow = this.shadowRoot;
    }),
  ], { shadow: false });
  const widget = pfuschTest('light-script');
  await flushEffects();
  assert.equal(query('.field'), widget.host.querySelector('.field'));
  assert.ok(!shadow);
});

test('unmount fires once on a light child dropped by its parent, and once on its own nodes', async () => {
  const calls = [];
  pfusch('light-leaf', () => [html.span({ unmount: () => calls.push('leaf-node') })], { shadow: false });
  pfusch('light-tree', { show: true }, (state) => [
    state.show ? html['light-leaf']({ unmount: () => calls.push('leaf-host') }) : null,
  ]);
  const tree = pfuschTest('light-tree');
  await flushEffects();
  tree.host.state.show = false;
  await flushEffects();
  assert.deepEqual(calls.sort(), ['leaf-host', 'leaf-node']);
});
