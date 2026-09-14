const PFUSCH_FACTORY_NAME = 'pfusch';

export const isIdentifierNamed = (node, name) =>
  node?.type === 'Identifier' && node.name === name;

export const isPfuschCall = (node) =>
  node?.type === 'CallExpression' && isIdentifierNamed(node.callee, PFUSCH_FACTORY_NAME);

export const getPfuschDefinition = (node) => {
  if (!isPfuschCall(node)) return null;

  const hasInitialState = node.arguments.length >= 3;
  const initialState = hasInitialState ? node.arguments[1] : null;
  const template = hasInitialState ? node.arguments[2] : node.arguments[1];

  if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(template?.type)) return null;

  return { initialState, template };
};

export const getStaticPropertyName = (node) => {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
};

export const getObjectPropertyName = (node) => {
  if (node?.type !== 'Property' || node.computed) return null;
  if (node.key.type === 'Identifier') return node.key.name;
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value;
  return null;
};

export const getDeclaredStateKeys = (initialState) => {
  if (initialState?.type !== 'ObjectExpression') return null;
  const keys = initialState.properties.map(getObjectPropertyName);
  return keys.every(Boolean) ? new Set(keys) : null;
};

export const findVariable = (sourceCode, identifier) => {
  for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const variable = scope.set.get(identifier.name);
    if (variable) return variable;
  }
  return null;
};

export const isReferenceToParameter = (sourceCode, identifier, parameter) => {
  if (!isIdentifierNamed(identifier, parameter?.name)) return false;
  const variable = findVariable(sourceCode, identifier);
  return variable?.defs.some((definition) => definition.type === 'Parameter' && definition.name === parameter);
};

export const isDefinitelyArray = (node) => {
  if (node?.type === 'ArrayExpression') return true;
  if (node?.type === 'ConditionalExpression') {
    return isDefinitelyArray(node.consequent) && isDefinitelyArray(node.alternate);
  }
  return false;
};

export const isDefinitelyNotArray = (node) => {
  if (!node) return true;
  if (['Literal', 'ObjectExpression', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
    return true;
  }
  if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
    return isIdentifierNamed(node.callee.object, 'html');
  }
  if (node.type === 'ConditionalExpression') {
    return isDefinitelyNotArray(node.consequent) || isDefinitelyNotArray(node.alternate);
  }
  return false;
};
