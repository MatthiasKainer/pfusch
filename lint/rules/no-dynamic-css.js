import { findVariable } from '../ast.js';

const isStableExpression = (sourceCode, expression) => {
  if (expression.type === 'Literal') return true;
  if (expression.type !== 'Identifier') return false;
  const variable = findVariable(sourceCode, expression);
  return variable?.defs.some((definition) =>
    definition.type === 'ImportBinding'
    || (definition.type === 'Variable' && definition.parent?.kind === 'const'));
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow interpolation in pfusch css templates.',
    },
    messages: {
      dynamicCss: 'Keep pfusch css templates static. Use CSS custom properties or classes for dynamic values.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== 'Identifier' || node.tag.name !== 'css') return;
        if (node.quasi.expressions.every((expression) => isStableExpression(sourceCode, expression))) return;
        context.report({ node, messageId: 'dynamicCss' });
      },
    };
  },
};
