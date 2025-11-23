export function getShadowRoot(shadowHost) {
  const root = shadowHost.evaluateHandle(e => e.shadowRoot);
  return root;
}