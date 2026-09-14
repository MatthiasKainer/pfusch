import { RuleTester } from 'eslint';
import pfuschLint from '../../lint/index.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

const runRule = (name, cases) => ruleTester.run(name, pfuschLint.rules[name], cases);

runRule('no-dynamic-css', {
  valid: [
    "const styles = css`.card { color: var(--ink); }`;",
    "const maxHeight = 320; const styles = css`.card { max-height: ${maxHeight}px; }`;",
  ],
  invalid: [
    {
      code: "const styles = css`.card { color: ${state.color}; }`;",
      errors: [{ messageId: 'dynamicCss' }],
    },
    {
      code: "let color = 'red'; const styles = css`.card { color: ${color}; }`;",
      errors: [{ messageId: 'dynamicCss' }],
    },
  ],
});

runRule('no-html-element', {
  valid: ["const content = html.div('content');"],
  invalid: [
    {
      code: "const content = html.element('content');",
      errors: [{ messageId: 'invalidHelper' }],
    },
  ],
});

runRule('no-to-element-in-template', {
  valid: [
    "pfusch('user-card', {}, () => [html.div('content')]);",
    "const element = toElement(html.div('content'));",
    "pfusch('user-card', {}, () => [html.button({ click: () => toElement(html.div('content')) })]);",
  ],
  invalid: [
    {
      code: "pfusch('user-card', {}, () => [toElement(html.div('content'))]);",
      errors: [{ messageId: 'imperativeRender' }],
    },
  ],
});

runRule('require-array-template', {
  valid: [
    "pfusch('user-card', {}, () => [html.div('content')]);",
    "pfusch('user-card', {}, () => enabled ? [] : [html.div('content')]);",
    "pfusch('user-card', {}, () => { return [html.div('content')]; });",
    "pfusch('user-card', {}, (state) => { return renderCard(state); });",
  ],
  invalid: [
    {
      code: "pfusch('user-card', {}, () => html.div('content'));",
      errors: [{ messageId: 'arrayRequired' }],
    },
    {
      code: "pfusch('user-card', {}, () => { return html.div('content'); });",
      errors: [{ messageId: 'arrayRequired' }],
    },
  ],
});

runRule('valid-state', {
  valid: [
    "pfusch('live-counter', { count: 0 }, (state) => [html.button({ click: () => state.count++ })]);",
    "pfusch('user-card', { title: '' }, (state) => [html.h2(state.title)]);",
  ],
  invalid: [
    {
      code: "pfusch('live-counter', { count: 0 }, (state) => [html.button({ click: () => state.cont++ })]);",
      errors: [{ messageId: 'undeclared', data: { key: 'cont' } }],
    },
    {
      code: "pfusch('user-card', { title: '' }, (state) => [html.h2(state.subtitle)]);",
      errors: [{ messageId: 'undeclared', data: { key: 'subtitle' } }],
    },
    {
      code: "pfusch('user-card', { title: '' }, (state) => [script(() => state.subscribe('subtitle', () => {}))]);",
      errors: [{ messageId: 'undeclared', data: { key: 'subtitle' } }],
    },
    {
      code: "pfusch('lazy-card', { as: 'lazy' }, (state) => [html.div(state.as)]);",
      errors: [{ messageId: 'reserved', data: { key: 'as' } }],
    },
  ],
});

runRule('no-on-event-prefix', {
  valid: [
    "const button = html.button({ click: () => submit() }, 'Save');",
    "const helper = html.div({ only: normalize });",
  ],
  invalid: [
    {
      code: "const button = html.button({ onClick: () => submit() }, 'Save');",
      errors: [{ messageId: 'prefixedEvent', data: { eventName: 'click', prefixedName: 'onClick' } }],
    },
    {
      code: "const input = html.input({ oninput: () => update() });",
      errors: [{ messageId: 'prefixedEvent', data: { eventName: 'input', prefixedName: 'oninput' } }],
    },
    {
      code: "const button = html.button({ onclick: submit }, 'Save');",
      errors: [{ messageId: 'prefixedEvent', data: { eventName: 'click', prefixedName: 'onclick' } }],
    },
  ],
});

runRule('no-event-as-trigger-detail', {
  valid: [
    "pfusch('user-card', {}, (_state, trigger) => [html.button({ click: (event) => trigger('select', { value: event.target.value }) })]);",
  ],
  invalid: [
    {
      code: "pfusch('user-card', {}, (_state, trigger) => [html.button({ click: (event) => trigger('select', event) })]);",
      errors: [{ messageId: 'eventDetail' }],
    },
    {
      code: "pfusch('user-card', {}, (_state, trigger) => [html.button({ click: (event) => trigger('select', { event }) })]);",
      errors: [{ messageId: 'eventDetail' }],
    },
  ],
});
