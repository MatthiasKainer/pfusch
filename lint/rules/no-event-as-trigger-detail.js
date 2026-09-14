import { findVariable, getPfuschDefinition, isReferenceToParameter } from '../ast.js';

const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

const isDescriptorHandlerParameter = (sourceCode, identifier) => {
  const variable = findVariable(sourceCode, identifier);
  return variable?.defs.some((definition) => {
    if (definition.type !== 'Parameter') return false;
    const fn = definition.node;
    if (!FUNCTION_TYPES.has(fn.type) || fn.parent?.type !== 'Property') return false;
    const property = fn.parent;
    const descriptorArgs = property.parent?.parent;
    return property.value === fn && descriptorArgs?.type === 'CallExpression'
      && descriptorArgs.callee?.type === 'MemberExpression'
      && descriptorArgs.callee.object?.type === 'Identifier'
      && descriptorArgs.callee.object.name === 'html';
  });
};

const containsHandlerParameter = (sourceCode, root) => {
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    const isMemberObject = node.parent?.type === 'MemberExpression' && node.parent.object === node;
    if (node.type === 'Identifier' && !isMemberObject && isDescriptorHandlerParameter(sourceCode, node)) {
      return true;
    }
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
      const child = node[key];
      if (Array.isArray(child)) pending.push(...child.filter(Boolean));
      else if (child) pending.push(child);
    }
  }
  return false;
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow DOM event objects in trigger details because they are not serializable.',
    },
    messages: {
      eventDetail: 'Do not pass a DOM event to trigger(). Extract the plain, serializable values consumers need.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const templates = new Map();
    const functionStack = [];

    const enterFunction = (node) => functionStack.push(node);
    const exitFunction = () => functionStack.pop();

    return {
      CallExpression(node) {
        const definition = getPfuschDefinition(node);
        if (definition) templates.set(definition.template, definition.template.params[1]);

        const currentTemplate = [...functionStack].reverse().find((fn) => templates.has(fn));
        if (!currentTemplate || node.arguments.length < 2) return;

        const triggerParameter = templates.get(currentTemplate);
        if (!isReferenceToParameter(sourceCode, node.callee, triggerParameter)) return;
        if (!containsHandlerParameter(sourceCode, node.arguments[1])) return;
        context.report({ node: node.arguments[1], messageId: 'eventDetail' });
      },
      ':function': enterFunction,
      ':function:exit': exitFunction,
    };
  },
};
