import { getObjectPropertyName, isIdentifierNamed } from '../ast.js';

const LOWERCASE_EVENT_NAMES = new Set([
  'blur', 'change', 'click', 'close', 'dblclick', 'error', 'focus', 'input',
  'keydown', 'keypress', 'keyup', 'load', 'mousedown', 'mouseenter', 'mouseleave',
  'mousemove', 'mouseout', 'mouseover', 'mouseup', 'reset', 'submit', 'toggle',
]);

const isPrefixedEventName = (name) => {
  if (!name.startsWith('on') || name.length <= 2) return false;
  const unprefixed = name.slice(2);
  return /^[A-Z]/.test(unprefixed) || LOWERCASE_EVENT_NAMES.has(unprefixed);
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require plain DOM event names in html descriptor attributes.',
    },
    messages: {
      prefixedEvent: "Use '{{eventName}}' instead of '{{prefixedName}}'. pfusch event keys do not use an 'on' prefix.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.type !== 'MemberExpression') return;
        if (!isIdentifierNamed(node.callee.object, 'html')) return;

        const attributes = node.arguments[0];
        if (attributes?.type !== 'ObjectExpression') return;

        for (const property of attributes.properties) {
          if (property.type !== 'Property') continue;

          const prefixedName = getObjectPropertyName(property);
          if (!prefixedName || !isPrefixedEventName(prefixedName)) continue;
          const eventName = prefixedName.slice(2);
          const normalizedEventName = eventName.charAt(0).toLowerCase() + eventName.slice(1);
          context.report({
            node: property.key,
            messageId: 'prefixedEvent',
            data: { eventName: normalizedEventName, prefixedName },
          });
        }
      },
    };
  },
};
