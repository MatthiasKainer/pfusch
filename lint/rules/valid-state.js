import {
  getDeclaredStateKeys,
  getPfuschDefinition,
  getStaticPropertyName,
  isReferenceToParameter,
} from '../ast.js';

const RESERVED_STATE_KEYS = new Set(['as', 'id', 'inject-links', 'inject-styles']);
const STATE_API_KEYS = new Set(['mutate', 'subscribe']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require every state key to be declared and reject pfusch-reserved state names.',
    },
    messages: {
      reserved: "State key '{{key}}' is reserved by pfusch and cannot be declared as component state.",
      undeclared: "State key '{{key}}' is not present in the pfusch initialState object.",
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const templates = new Map();
    const functionStack = [];

    const enterFunction = (node) => functionStack.push(node);
    const exitFunction = () => functionStack.pop();

    const getCurrentState = () => {
      const currentTemplate = [...functionStack].reverse().find((fn) => templates.has(fn));
      return currentTemplate ? templates.get(currentTemplate) : null;
    };

    const checkStateMember = (member) => {
      const currentState = getCurrentState();
      if (!currentState) return;

      const { declaredKeys, stateParameter } = currentState;
      if (!declaredKeys || !isReferenceToParameter(sourceCode, member.object, stateParameter)) return;

      const key = getStaticPropertyName(member);
      if (key && !STATE_API_KEYS.has(key) && !declaredKeys.has(key)) {
        context.report({ node: member.property, messageId: 'undeclared', data: { key } });
      }
    };

    const checkSubscription = (node) => {
      if (node.callee.type !== 'MemberExpression') return;
      if (getStaticPropertyName(node.callee) !== 'subscribe') return;

      const currentState = getCurrentState();
      if (!currentState) return;
      const { declaredKeys, stateParameter } = currentState;
      if (!declaredKeys || !isReferenceToParameter(sourceCode, node.callee.object, stateParameter)) return;

      const keyArgument = node.arguments[0];
      if (keyArgument?.type !== 'Literal' || typeof keyArgument.value !== 'string') return;
      if (!declaredKeys.has(keyArgument.value)) {
        context.report({
          node: keyArgument,
          messageId: 'undeclared',
          data: { key: keyArgument.value },
        });
      }
    };

    return {
      CallExpression(node) {
        const definition = getPfuschDefinition(node);
        if (definition) {
          const declaredKeys = definition.initialState === null
            ? new Set()
            : getDeclaredStateKeys(definition.initialState);
          const stateParameter = definition.template.params[0];
          templates.set(definition.template, { declaredKeys, stateParameter });

          if (definition.initialState?.type === 'ObjectExpression') {
            for (const property of definition.initialState.properties) {
              if (property.type !== 'Property' || property.computed) continue;
              const key = property.key.type === 'Identifier' ? property.key.name : property.key.value;
              if (RESERVED_STATE_KEYS.has(key)) {
                context.report({ node: property.key, messageId: 'reserved', data: { key } });
              }
            }
          }
        }
        checkSubscription(node);
      },
      MemberExpression(node) {
        checkStateMember(node);
      },
      ':function': enterFunction,
      ':function:exit': exitFunction,
    };
  },
};
