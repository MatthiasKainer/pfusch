import { getStaticPropertyName, isIdentifierNamed } from '../ast.js';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow html.element(), which creates a literal non-standard element tag.',
    },
    messages: {
      invalidHelper: 'html.element() creates a literal <element> tag. Use html.div(), html.span(), or a concrete tag helper.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isIdentifierNamed(node.callee?.object, 'html')) return;
        if (getStaticPropertyName(node.callee) !== 'element') return;
        context.report({ node, messageId: 'invalidHelper' });
      },
    };
  },
};
