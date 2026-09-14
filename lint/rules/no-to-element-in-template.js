import { getPfuschDefinition, isIdentifierNamed } from '../ast.js';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow materializing descriptors inside a pfusch template.',
    },
    messages: {
      imperativeRender: 'Return the descriptor from the template instead of calling toElement() inside it.',
    },
    schema: [],
  },
  create(context) {
    const templateFunctions = new Set();
    const functionStack = [];

    const enterFunction = (node) => functionStack.push(node);
    const exitFunction = () => functionStack.pop();

    return {
      CallExpression(node) {
        const definition = getPfuschDefinition(node);
        if (definition) templateFunctions.add(definition.template);

        if (!isIdentifierNamed(node.callee, 'toElement')) return;
        if (!templateFunctions.has(functionStack.at(-1))) return;
        context.report({ node, messageId: 'imperativeRender' });
      },
      ':function': enterFunction,
      ':function:exit': exitFunction,
    };
  },
};
