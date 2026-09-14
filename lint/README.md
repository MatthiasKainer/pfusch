# pfusch ESLint definition

This directory exports a flat-config ESLint plugin for mistakes that are specific
to pfusch and cannot be covered accurately by ESLint's general JavaScript rules.

## Use

Install `eslint` in the consuming project, then import the plugin from the pfusch
package in `eslint.config.js`:

```js
import pfuschLint from 'pfusch/lint/index.js';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  pfuschLint.configs.recommended,
];
```

The recommended definition enables every rule as an error:

| Rule | Prevents |
| --- | --- |
| `pfusch/valid-state` | Reads, writes, or subscriptions using undeclared state and declarations using pfusch-reserved attributes. |
| `pfusch/require-array-template` | Templates returning a descriptor or another non-array value. |
| `pfusch/no-dynamic-css` | Per-render stylesheet creation caused by interpolation in `css` templates. |
| `pfusch/no-html-element` | Accidental creation of a literal `<element>` tag. |
| `pfusch/no-on-event-prefix` | React-style `onclick`/`onClick` handlers instead of pfusch's plain `click` event key. |
| `pfusch/no-to-element-in-template` | Bypassing pfusch's descriptor reconciliation inside a template. |
| `pfusch/no-event-as-trigger-detail` | Passing a DOM event through `trigger()`, whose `postMessage` payload must be serializable. |

Rules can also be enabled individually:

```js
import pfuschLint from 'pfusch/lint/index.js';

export default [{
  plugins: { pfusch: pfuschLint },
  rules: {
    'pfusch/valid-state': 'error',
  },
}];
```

The definition intentionally does not enforce a product namespace, an Atomic
Design directory layout, or a particular set of CSS custom properties. Those
are application and design-system policies rather than pfusch runtime contracts.
