import noDynamicCss from './rules/no-dynamic-css.js';
import noEventAsTriggerDetail from './rules/no-event-as-trigger-detail.js';
import noHtmlElement from './rules/no-html-element.js';
import noOnEventPrefix from './rules/no-on-event-prefix.js';
import noToElementInTemplate from './rules/no-to-element-in-template.js';
import requireArrayTemplate from './rules/require-array-template.js';
import validState from './rules/valid-state.js';

const rules = {
  'no-dynamic-css': noDynamicCss,
  'no-event-as-trigger-detail': noEventAsTriggerDetail,
  'no-html-element': noHtmlElement,
  'no-on-event-prefix': noOnEventPrefix,
  'no-to-element-in-template': noToElementInTemplate,
  'require-array-template': requireArrayTemplate,
  'valid-state': validState,
};

const recommendedRules = Object.fromEntries(
  Object.keys(rules).map((name) => [`pfusch/${name}`, 'error']),
);

const plugin = {
  meta: {
    name: 'eslint-plugin-pfusch',
    version: '1.0.0',
  },
  configs: {},
  rules,
};

plugin.configs.recommended = {
  name: 'pfusch/recommended',
  plugins: { pfusch: plugin },
  rules: recommendedRules,
};

export default plugin;
