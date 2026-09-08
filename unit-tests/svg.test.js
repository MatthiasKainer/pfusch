// svg.test.js - descriptors for SVG tags render into the SVG namespace and survive a re-render
import assert from 'node:assert/strict';
import test from 'node:test';
import { pfusch, html, toElement } from '../pfusch.js';
import { flushEffects, pfuschTest, setupDomStubs } from './pfusch-stubs.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

let restore;

test.before(() => {
  ({ restore } = setupDomStubs());
});

test.after(() => {
  restore?.();
});

// ============================================================================
// Namespaces
// ============================================================================

test('an svg descriptor and its descendants land in the SVG namespace', () => {
  const svg = toElement(html.svg(html.g(html.circle({ r: '10' }), html.path({ d: 'M2 12 L22 12' }))));

  assert.equal(svg.namespaceURI, SVG_NS);
  assert.equal(svg.tagName, 'svg');
  const g = svg.querySelector('g');
  assert.equal(g.namespaceURI, SVG_NS);
  assert.equal(svg.querySelector('circle').namespaceURI, SVG_NS);
  assert.equal(svg.querySelector('path').namespaceURI, SVG_NS);
});

test('a plain div descriptor stays in the HTML namespace', () => {
  assert.equal(toElement(html.div('hi')).namespaceURI, XHTML_NS);
});

test('foreignObject hands its children back to the HTML namespace', () => {
  const svg = toElement(html.svg(html.foreignObject({ width: '24', height: '24' }, html.div('label'))));

  const fo = svg.querySelector('foreignObject');
  assert.equal(fo.namespaceURI, SVG_NS);
  assert.equal(fo.querySelector('div').namespaceURI, XHTML_NS);
});

test('camelCase SVG attributes keep their case', () => {
  const svg = toElement(html.svg({ viewBox: '0 0 24 24' }, html.path({ d: 'M2 12', pathLength: '1' })));

  assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
  assert.equal(svg.querySelector('path').getAttribute('pathLength'), '1');
});

// ============================================================================
// Node identity across a re-render (a lowercase tagName must not force a rebuild)
// ============================================================================

test('a state change that only flips the root class keeps every SVG node', async () => {
  pfusch('svg-ring', { on: false }, (state) => [
    html.svg({ viewBox: '0 0 24 24', class: state.on ? 'on' : 'off' },
      html.g({ class: 'rotor' },
        html.circle({ class: 'arc', r: '10' }),
        html.path({ class: 'tick', d: 'M2 12 L22 12', pathLength: '1' }),
      ),
    ),
  ]);

  const app = pfuschTest('svg-ring');
  const before = ['svg', 'g', 'circle', 'path'].map(sel => app.shadowRoot.querySelector(sel));
  assert.ok(before.every(Boolean), 'the initial render paints the whole SVG tree');
  assert.equal(before[0].getAttribute('class'), 'off');

  // A transition already running on the arc: a rebuilt node would drop it.
  const animation = before[2].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });

  app.state.on = true;
  await flushEffects();

  const after = ['svg', 'g', 'circle', 'path'].map(sel => app.shadowRoot.querySelector(sel));
  after.forEach((node, i) => assert.equal(node, before[i], `node ${i} was rebuilt`));
  assert.equal(after[0].getAttribute('class'), 'on');
  assert.equal(after[0].getAttribute('viewBox'), '0 0 24 24');
  assert.equal(after[3].getAttribute('pathLength'), '1');
  assert.deepEqual(after[2].getAnimations(), [animation]);
});

// ============================================================================
// The harness parses innerHTML, so raw SVG markup is queryable
// ============================================================================

test('setting innerHTML to SVG markup produces queryable, namespaced children', () => {
  const el = document.createElement('div');
  el.innerHTML = '<svg><g class="rotor"><circle class="arc"/></g></svg>';

  const arc = el.querySelector('.arc');
  assert.ok(arc, 'the parsed circle is reachable via querySelector');
  assert.equal(arc.namespaceURI, SVG_NS);
  assert.equal(el.querySelector('svg').namespaceURI, SVG_NS);
});
