import { getPfuschDefinition, isDefinitelyNotArray } from '../ast.js';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require pfusch templates to return an array.',
    },
    messages: {
      arrayRequired: 'A pfusch template must return an array of renderable values.',
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
        if (!definition) return;
        templateFunctions.add(definition.template);

        if (definition.template.body.type === 'BlockStatement') return;
        if (isDefinitelyNotArray(definition.template.body)) {
          context.report({ node: definition.template.body, messageId: 'arrayRequired' });
        }
      },
      ReturnStatement(node) {
        const currentFunction = functionStack.at(-1);
        if (!templateFunctions.has(currentFunction)) return;
        if (isDefinitelyNotArray(node.argument)) {
          context.report({ node, messageId: 'arrayRequired' });
        }
      },
      ':function': enterFunction,
      ':function:exit': exitFunction,
    };
  },
};
