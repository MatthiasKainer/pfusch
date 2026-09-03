# pfusch — agent reference

pfusch is a ~172-line zero-dependency web component library (`pfusch.js`, no build step). It defines custom elements backed by Shadow DOM, direct-mutation state, and lightweight descriptor objects instead of a virtual DOM. This doc is the fast path to using it correctly — read the **Hard rules** before writing any component, they cover the behavior that isn't obvious from the API shape alone. The full source is pinned at the bottom as ground truth; if anything here conflicts with it, the source wins.

## Mental model

- `pfusch(tagName, initialState, template)` registers a custom element. `template(state, trigger, helpers)` returns an array of things to render: `html.*` descriptors, real DOM nodes, strings, `css` results, `script(...)` calls, or `null`/nested arrays (falsy entries are skipped).
- There is no virtual DOM diffing. pfusch patches only the specific attributes/children that changed (`syncChildren` in the source).
- State is a `Proxy` over a plain object. Assign declared top-level keys directly (`state.count++`). Wrap synchronous nested changes in `state.mutate(state => state.items.push(x))`; it schedules one render without deep proxies. Updates are batched onto the next microtask.
- Declared state keys automatically become observed HTML attributes (in camelCase, lowercase, and kebab-case forms). Components are `formAssociated`; those with a `name` submit the complete JSON state, while unnamed components skip form serialization.
- Progressive enhancement is the intended default: write real HTML inside the custom element's tag, then read/keep it via the `children`/`childElements` helper instead of rebuilding it from scratch.

## Quick start

```js
import { pfusch, html } from "./pfusch.js";

pfusch("live-counter", { count: 0 }, (state) => [
  html.div(
    html.p(`Count: ${state.count}`),
    html.button({ click: () => state.count++ }, "Increment")
  )
]);
```

```html
<live-counter></live-counter>
<script type="module" src="./app.js"></script>
```

## API surface

| Export | Signature | Purpose |
|---|---|---|
| `pfusch` | `(tagName, initialState = {}, template) => CustomElementClass` | Defines and registers the custom element. `initialState` is optional — if omitted, `template` becomes the second argument. |
| `html` | `html.div(...)`, `html["my-tag"](...)` | Proxy that builds descriptors: `{ _t, _a, _c, _re }` (tag, attrs, children, event handlers). Never real DOM until pfusch patches it in. First object argument = attrs/events, everything else = children. Also supports tagged-template calls: `` html.h2`Hello ${x}` ``. |
| `html.raw` | `` html.raw`<b>...</b>` `` | Raw HTML string as a child (sets `innerHTML`, bypasses descriptor diffing for that subtree). |
| `css` | `` css`...` `` | Returns `{ type: 'style', content() }`; adopted into the component's shadow root. Cached globally by rendered text — **keep the template literal static**, don't interpolate per-instance values into it. |
| `script` | `(fn) => { type: 'script', content: fn }` | Runs `fn` once per connected lifecycle with `this` bound to `{ component, shadowRoot, state, addEventListener, querySelector, querySelectorAll }`. It may return a cleanup function, which runs after disconnection; reconnecting runs `fn` again. |
| `toElement` | `(descriptor) => HTMLElement` | Materializes a descriptor into a real DOM node, recursively. Only use it **outside** a render cycle (standalone utilities, tests, imperative code) — inside a template, return descriptors and let pfusch patch them. |
| lifecycle attrs | `keep`, `mount(e)`, `unmount(e)`, `exit` in a descriptor's attrs object | The four reserved names for animation and imperative DOM. `keep: true` — template owns the node's attrs/listeners/props, **you** own its children (stops the empty-descriptor clear). `mount(e)`/`unmount(e)` — functions dispatched as CustomEvents when pfusch creates/first adopts the node (and again when a disconnected component reconnects) and after it removes it (or the whole component disconnects). `exit` — a class name (string) or a handler (function) applied at removal; the differ marks the node `data-pfusch="exit"`, excludes it from diffing and reordering, and awaits its *pending* animations before removing it and firing `unmount`. See rules 14/15. |

**Template function signature:** `(state, trigger, helpers) => [...]`
- `trigger(name, detail)` — dispatches a `CustomEvent` as both `"<tagName>.<name>"` and bare `"<name>"` (bubbling, composed), *and* broadcasts via `window.postMessage({ eventName, detail: { sourceId, data } })` where `data` is `JSON.stringify(detail)`. The two delivery paths carry different shapes for `detail` — native listeners get the live object, `postMessage` listeners get the stringified `data` field and must parse it themselves. **Pass plain, serializable data** (`{ value: state.value }`), not a raw `Event`/`MouseEvent` object — see rule 11.
- `helpers.children(selector?)` — the component's original light-DOM child elements (real `HTMLElement`s, not descriptors). No selector = all of them.
- `helpers.childElements(selector?)` — like `children()` but descriptor-wrapped, safe to pass straight into a returned array.

## Hard rules

These are the things that don't fall out of reading the API — get them wrong and you'll either silently do nothing or silently do the wrong thing.

1. **State key names must match exactly.** `state.contentText = x` and `state.contenttext = x` are *different properties* on the underlying object. Only the exact key you declared in `initialState` is wired up to attributes/re-renders. Setting any other key still "works" (it's a plain object) but pfusch now emits a one-time `console.warn` for it — treat that warning as a real bug, not noise.
2. **Attribute names are case-flexible on the way in, not on the way out.** `contentText`, `contenttext`, and `content-text` as HTML attributes all map to a declared `contentText` state key. Going the other direction, you must use the exact declared casing.
3. **Only a fixed list of boolean attributes get presence/absence semantics**: `checked, selected, disabled, readonly, multiple, hidden, required, autofocus, open, inert`. A boolean state value bound to any other attribute name is serialized as the literal string `"true"`/`"false"` — which is what you actually want for `aria-*` attributes (`aria-hidden`, `aria-expanded`, ...). Don't expect an arbitrary custom attribute to behave like `disabled`.
4. **`css` templates must be static.** The compiled `CSSStyleSheet` is cached in a module-global `Map` keyed by the rendered CSS text, and it's never evicted. `` css`color: ${state.color}` `` with a frequently-changing `state.color` will leak stylesheets for the life of the page. Parameterize with CSS variables or classes instead.
5. **`as="lazy"` defers the first render.** A component with that attribute renders nothing until `as` changes away from `"lazy"` (or is removed) — e.g. via an `IntersectionObserver`. Don't declare a state key named `as`, `id`, `inject-styles`, or `inject-links` — those attribute names are reserved by pfusch itself and are special-cased before the normal state-attribute mapping. On *descriptors*, `id`, `keep`, `mount`, `unmount` and `exit` are likewise reserved; on real nodes so is `data-pfusch`, which pfusch writes on injected `<link>`/`<style>` clones and on nodes that are animating out — it ignores any node carrying it, so never set it yourself.
6. **`inject-styles` / `inject-links` override the defaults.** By default, every component pulls in `document.querySelectorAll('style[data-pfusch]')` and `link[data-pfusch]` into its shadow root once, on first render. Set those attributes on the component tag to point at a different selector instead. External page CSS never penetrates the shadow DOM otherwise — use `css` or one of these two mechanisms, not a bare `<style>`/`<link>` with no `data-pfusch` attribute.
7. **`helpers.children()` returns real, live DOM elements**, not descriptors — you can call `.querySelector`, mutate `.classList`, add listeners, etc. directly on them, and return them as-is in the template array. Don't try to convert them to `html.*` calls first.
8. **This is not React.** No virtual DOM and no `useEffect`. Assign declared top-level `state.*` keys directly; use synchronous `state.mutate(fn)` for nested changes. Nested-only mutation notifies all subscribers because pfusch does not install deep proxies. Use `script(...)` + `state.subscribe(key, cb)` for effect-like behavior and return the unsubscribe function for cleanup; event handler keys are plain DOM event names (`click`, not `onClick`).
9. **`.element`** on any descriptor is an escape hatch (`setAttribute`/`classList`/`innerHTML`-like proxy over the descriptor's internals) for imperatively mutating a descriptor across multiple statements before returning it. Prefer passing everything through the attrs object or `html.raw` for one-shot cases; reach for `.element` only when you're building a descriptor up incrementally. **Don't confuse this with rule 10.**
10. **`html.element(...)` is not a thing — and won't tell you that.** `html` is an unguarded `Proxy` over tag names, so `html.element(...)` doesn't throw; it silently builds a descriptor for a literal, non-standard `<element>` tag. There is no generic "element" constructor. If you want a plain container, use `html.div(...)`/`html.span(...)`. (This is unrelated to the `.element` *getter* in rule 9 — same word, two unrelated APIs.)
11. **Never pass a raw `Event`/`MouseEvent` object as `trigger()`'s `detail`.** `trigger` JSON-stringifies `detail` for the `postMessage` broadcast; a DOM event contains circular references. That stringify is wrapped in a try/catch, so it won't throw — but it silently falls back to `data: null`, so any `postMessage` listener gets nothing. (The native `CustomEvent` listener path still gets the live object, circular refs and all — the two delivery paths can end up carrying completely different payloads for the same `trigger()` call.) Pass plain data instead: `trigger("clicked", { value: state.value })`, not `trigger("clicked", e)`.
12. **`html.slot() || fallback` never falls back.** Every `html.*` call returns an object, and objects are always truthy — `||` will pick `html.slot()` unconditionally regardless of whether anything is actually slotted in. Gate on an explicit condition instead: `hasContent ? html.slot() : fallbackUi`. Also treat `helpers.children()`/`childElements()` as a one-time snapshot of the light DOM taken around first render, not a live subscription to nodes appended later.
13. **Prefer declarative event binding for elements the template itself renders**: `html.button({ click: fn })`, not `this.querySelector(...).addEventListener(...)` inside `script()`. `script()` runs once per connected lifecycle, during render, and its timing relative to node placement isn't something to rely on for elements pfusch owns. Reserve manual listeners for light DOM, `window`, `document`, or third-party widgets, and return a function that removes them.
14. **`keep` splits ownership, it does not switch the differ off.** `keep: true` exempts a node's *children* from diffing, nothing else. Attributes are still synced on every render, and `syncAttrs` removes anything the descriptor doesn't declare — so an engine that stamps `data-state` on the kept host loses it on the next render; write inside the node instead. `keep` is itself serialized as `keep="true"`, which makes `[keep]` a usable CSS hook.
15. **`mount`/`unmount`/`exit` are node lifecycle, not component lifecycle.** `mount` fires once per node, normally **before insertion** (the node has no layout yet), but on an already-connected node when pfusch adopts hydrated markup or a disconnected component reconnects — so never rely on either state and measure in a `requestAnimationFrame`. A tag change produces a new node, which mounts again. `unmount` reaches every node under the removed one that declared it, so an engine nested inside a dropped list row is torn down; `exit`, by contrast, plays only on the node the differ removes itself — a nested `exit` inside a removed parent is not awaited. `unmount` fires when the differ drops the node and when the whole component genuinely disconnects (after its `script()` cleanups ran); reconnecting that component fires `mount` again on the same nodes, so an engine is rebuilt without the node being recreated. A synchronous move in the DOM is neither. `exit` awaits `getAnimations({ subtree: true })` filtered to `pending` animations only: an animation that was already running does not delay removal, nothing pending means removal on the next microtask (which is exactly what `@media (prefers-reduced-motion: reduce) { .leaving { animation: none } }` buys you), and an *infinite* exit animation pins the node in the DOM forever. While a node is exiting its id is live twice if the template re-adds it — the exiting node is out of the diff, so a fresh one is built.


## Canonical patterns

**Events, loosely coupled:**
```js
pfusch("data-loader", {}, (state, trigger) => [
  html.button({
    click: async () => {
      const data = await fetch("/api/data").then(r => r.json());
      trigger("loaded", { data }); // fires as "data-loader.loaded"
    }
  }, "Load")
]);
```

**Progressive enhancement (keep the original markup, add behavior):**
```js
pfusch("email-form", { status: "" }, (state, trigger, { children }) => [
  script(function () {
    this.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.status = "Submitting...";
      await fetch(e.target.action, { method: "POST", body: new FormData(e.target) });
      state.status = "Done";
    });
  }),
  children()[0], // the original <form>, untouched
  state.status ? html.p(state.status) : null
]);
```

**Reacting to state changes (the "effect" pattern):**
```js
pfusch("item-list", { source: "", items: [] }, (state) => [
  script(function () {
    state.subscribe("source", async (src) => {
      if (src) state.items = await fetch(`/data/${src}.json`).then(r => r.json());
    });
  }),
  html.ul(...state.items.map(item => html.li(item.name)))
]);
```

**Lazy-loading a below-the-fold component:**
```html
<expensive-widget as="lazy"></expensive-widget>
<script type="module">
  const el = document.querySelector("expensive-widget");
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { el.removeAttribute("as"); obs.disconnect(); }
  }).observe(el);
</script>
```

## Testing

Use `unit-tests/pfusch-stubs.js` for pure-Node tests (no browser needed):

```js
import { setupDomStubs, pfuschTest, flushEffects } from "./unit-tests/pfusch-stubs.js";
import { pfusch, html } from "./pfusch.js";

const { restore } = setupDomStubs();
pfusch("my-widget", {}, () => [html.div("hi")]);

const widget = pfuschTest("my-widget");
await flushEffects();
assert.equal(widget.get("div").textContent, "hi");
restore();
```

`pfuschTest(tagName, attrs?)` returns a `PfuschNodeCollection`, not a raw array — use its helpers instead of indexing into `.elements` directly:
- `.first` — first matched node, still wrapped in a collection.
- `.at(index)` — a specific node, wrapped.
- `.get(selector)` — queries each matched node and its shadow root (if any), returns another collection.
- `.click()` / `.submit()` — act on the first matched node.
- `.value` / `.checked` / `.textContent` (getters and setters) — read/write on the first matched node.
- `.host` — the underlying custom element instance, for reaching `.state`, `.shadowRoot`, `.internals`, etc. directly.
- `.flush()` — instance-scoped shorthand for the module-level `flushEffects()`.

**`flushEffects()`/`.flush()` timing**: it awaits two microtask turns plus a `setTimeout(..., 0)`. Any `fetch` (or other async work) started inside `script()` will typically resolve by the *first* `flush()` if its mock resolves immediately — so don't rely on a `setTimeout`/delayed toggle to keep a "loading" state alive across a flush in tests; it will usually be consumed. Prefer deterministic mocks over open-ended `await new Promise(...)`/polling loops in tests.

**Mocking `fetch`**: `setupDomStubs()` installs a `fetch` stub on `globalThis.fetch` with `addRoute(urlSubstring, payload)`, `resetRoutes()`, `getCalls()`, and `resetCalls()` — route by a substring match against the request URL rather than mocking your own service layer.

```js
globalThis.fetch.addRoute("/api/data", { items: [{ name: "x" }] });
// ...render + flush...
assert.equal(globalThis.fetch.getCalls().length, 1);
```

## Anti-patterns (things that look reasonable but aren't)

- Reassigning `state = {...}` instead of mutating keys — breaks the reactivity proxy.
- Passing `onClick`/camelCase event names — use plain DOM event names.
- Rebuilding light-DOM content that `children()`/`childElements()` already gives you for free.
- Relying on a bare `<style>`/`<link>` in the page to style a component — it won't cross the shadow boundary; use `css`, `data-pfusch`, or `inject-styles`/`inject-links`.
- Interpolating dynamic/per-instance values into a `` css`...` `` template.
- Using `toElement()` inside a template function — return descriptors instead and let pfusch patch them.
- Calling `html.element(...)` expecting a generic container — it builds a literal `<element>` tag; use `html.div`/`html.span`.
- `html.slot() || fallback` to show fallback content when nothing is slotted — the descriptor is always truthy, so the fallback branch never runs.
- Passing a raw DOM event to `trigger(name, e)` — pass a plain, serializable object instead.
- Removing a node yourself from an `animationend`/`transitionend` listener with no fallback timer — the event never fires if the animation is cancelled, interrupted, or removed by a `prefers-reduced-motion` rule, and the node leaks. Declare `exit` and let the differ await the animation.

## Full source (ground truth)

`pfusch.js`, current as of this doc:

```js
const s = 'string', o = 'object', jstr = JSON.stringify, cssCache = new Map();
// Standard HTML boolean attributes: a boolean value here means presence/absence, not the string "true"/"false".
// This deliberately excludes aria-* (aria-hidden, aria-expanded, ...), which require the literal string.
const boolAttrs = ['checked', 'selected', 'disabled', 'readonly', 'multiple', 'hidden', 'required', 'autofocus', 'open', 'inert'], boolAttrSet = new Set(boolAttrs);
const json = j => { try { return j && typeof j === s ? JSON.parse(j) : j; } catch { return j; } };
const str = (string, ...tags) => typeof string === s ? string : string.reduce((acc, part, i) => acc + part + (tags[i] ?? ''), '');
const isEl = n => n && (n.nodeType === 1 || (typeof window !== 'undefined' && window.Element && n instanceof window.Element));
const isBoolAttrValue = (key, value) => boolAttrSet.has(key) && typeof value === 'boolean';
// _f bitflags (kept as a single field to stay small after minification):
const SCRIPTS_EXEC = 1, STYLES_INJECTED = 2, LINKS_CLONED = 4, RENDERING = 8, NEEDS_RERENDER = 16, INIT = 32, QUEUED = 64, UNMOUNTED = 128;
const attrNames = k => [k, k.toLowerCase(), k.replace(/[A-Z]/g, "-$&").toLowerCase()];
const copyState = v => Array.isArray(v) ? v.map(copyState) : v && Object.getPrototypeOf(v) === Object.prototype ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyState(x)])) : v;

// cssCache is unbounded and keyed by the rendered CSS text — fine for the intended use (static css`` templates
// shared across instances), but avoid interpolating per-instance/dynamic values into a css`` template.
export const css = (style, ...tags) => {
    const cssText = str(style, ...tags); let sheet;
    const content = () => {
        if (sheet) return sheet;
        sheet = cssCache.get(cssText);
        if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(cssText); cssCache.set(cssText, sheet); }
        return sheet;
    };
    return { type: 'style', content };
};
export const script = js => ({ type: 'script', content: js });

// Descriptor: { _t: tag, _a: attrs, _c: children, _re: handlers } — no real DOM nodes until sync
class Element {
    constructor(tag, ...rest) { this._t = tag; this._a = {}; this._c = []; this._re = {}; rest.forEach((item, i) => this.add(item, () => rest.slice(i + 1))); }
    get element() {
        const a = this._a, s = this;
        const cl = { add: (...c) => { a.class = [...new Set([...(a.class?.split(' ') || []), ...c])].filter(Boolean).join(' '); }, remove: (...c) => { const r = new Set(c); a.class = (a.class?.split(' ') || []).filter(x => !r.has(x)).join(' '); }, contains: c => (a.class?.split(' ') || []).includes(c), toggle: (c, f) => { const has = cl.contains(c); (f ?? !has) ? cl.add(c) : cl.remove(c); } };
        return new Proxy(a, { get(_, k) { return k === 'innerHTML' ? (s._html || '') : k === 'setAttribute' ? (n, v) => { a[n] = v; } : k === 'getAttribute' ? (n) => a[n] != null ? String(a[n]) : null : k === 'removeAttribute' ? (n) => { delete a[n]; } : k === 'hasAttribute' ? (n) => n in a : k === 'classList' ? cl : a[k]; }, set(_, k, v) { if (k === 'innerHTML') s._html = v; else a[k] = v; return true; } });
    }
    add(option, ah = () => []) {
        if (option == null || option === false) return this;
        const t = typeof option;
        if (t === s || t === 'number' || t === 'bigint') this._c.push(String(option));
        else if (option.raw) this._html = str(option, ...ah());
        else if (Array.isArray(option)) option.forEach(c => this.add(c, ah));
        else if (option._t || option.element || option instanceof HTMLElement) this._c.push(option);
        else if (t === o) Object.entries(option).forEach(([k, v]) => { if (+k == k) return; if (typeof v === 'function') this._re[k] = v; else this._a[k] = v; });
        return this;
    }
}

const toElem = node => node?._t ? node : (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) ? { element: node } : node?.nodeType === 3 ? node.textContent : node;
export const toElement = (desc) => { const el = document.createElement(desc._t); for (const [k, v] of Object.entries(desc._a)) if (typeof v !== 'function' && v != null) { if (isBoolAttrValue(k, v)) { if (v) el.setAttribute(k, 'true'); } else el.setAttribute(k, typeof v === o ? jstr(v) : String(v)); } for (const [k, h] of Object.entries(desc._re)) { el._re ??= {}; el.addEventListener(k, el._re[k] = h); } if (desc._html !== undefined) el.innerHTML = desc._html; else for (const c of desc._c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c._t ? toElement(c) : c.element || c); if (desc._re.mount) el.dispatchEvent(new CustomEvent('mount')); return el; };

export const html = new Proxy({}, { get: (_, key) => key === 'raw' ? (content, ...tags) => ({ _t: 'span', _a: {}, _c: [], _re: {}, _html: str(content, ...tags) }) : (...args) => new Element(key, ...args) });

export function pfusch(tagName, initialState, template) {
    if (!template) [template, initialState] = [initialState, {}];
    const attrMap = Object.fromEntries(Object.keys(initialState).flatMap(k => attrNames(k).map(n => [n, k])));
    const boolStateKeys = new Set(Object.entries(initialState).filter(([, v]) => typeof v === 'boolean').map(([k]) => k));
    const toStateValue = (key, rawValue) => {
        const parsed = json(rawValue);
        return !boolStateKeys.has(key) ? parsed : rawValue === null ? false : rawValue === '' ? true : typeof parsed === 'boolean' ? parsed : Boolean(parsed);
    };

    class Pfusch extends HTMLElement {
        static formAssociated = true;
        static observedAttributes = ["id", "as", "inject-styles", "inject-links", ...Object.keys(initialState).flatMap(attrNames)];
        #internals;

        get internals() { return this.#internals; }

        constructor() {
            super();
            this.#internals = this.attachInternals();
            this._f = INIT; this._subs = {}; this._cleanups = []; this._version = 0; this._renderedVersion = -1;
            this._disconnectPending = false;
            this.lightDOMChildren = Array.from(this.children);
            this._lightById = new Map([...this.lightDOMChildren, ...this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []))].filter(c => c.id).map(c => [c.id, c]));
            this._lightDomRetryDone = false;
            this.attachShadow({ mode: 'open', serializable: true });
            this._raw = copyState(initialState);
            for (const k of Object.keys(initialState)) { let v = null; for (const attrName of attrNames(k)) if ((v = this.getAttribute(attrName)) !== null) break; if (v !== null) this._raw[k] = toStateValue(k, v); }
            this.state = new Proxy(this._raw, {
                set: (target, key, value) => { if (target[key] !== value) { if (key !== "subscribe" && key !== "mutate" && !(key in target)) console.warn(`pfusch: <${tagName}> set state.${key}, which isn't in initialState — check for a typo`); target[key] = value; this._version++; if (key !== "subscribe" && key !== "mutate" && !(this._f & INIT)) this.scheduleRender(); (this._subs[key] || []).forEach(cb => cb(value)); } return true; },
                get: (target, key) => key === 'subscribe' ? (prop, cb) => { (this._subs[prop] ??= []).push(cb); try { cb(target[prop]); } catch { } return () => { const a = this._subs[prop]; if (a) this._subs[prop] = a.filter(f => f !== cb); }; } : key === 'mutate' ? fn => { if (typeof fn !== 'function') return; const version = this._version; let result; try { result = fn(this.state); } catch (e) { console.error('Mutation error:', e); } if (version === this._version) { this._version++; if (!(this._f & INIT)) this.scheduleRender(); Object.entries(this._subs).forEach(([k, cbs]) => cbs.forEach(cb => { try { cb(target[k]); } catch { } })); } return result; } : target[key]
            });
        }

        connectedCallback() { this._disconnectPending = false; if (this._f & INIT) { this._f &= ~INIT; if (this.getAttribute('as') !== 'lazy') this.render(); } else { if (this._f & UNMOUNTED) { this._f &= ~UNMOUNTED; this.lifecycle('mount'); } if (!(this._f & SCRIPTS_EXEC)) this.render(true); } }
        disconnectedCallback() { this._disconnectPending = true; queueMicrotask(() => { if (!this._disconnectPending || this.isConnected) return; this._disconnectPending = false; this._cleanups.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error('Cleanup error:', e); } }); this._f &= ~SCRIPTS_EXEC; this._f |= UNMOUNTED; this.lifecycle('unmount'); this.dispatchEvent(new CustomEvent('disconnected', { bubbles: false }));}); }
        lifecycle(ev, root = this.shadowRoot) { for (const n of [root, ...root.querySelectorAll('*')]) if (n._re?.[ev]) n.dispatchEvent(new CustomEvent(ev)); } // fires on root and every descendant that declared the hook: used for whole-component disconnect/reconnect and for dropped subtrees
        getStableId(tag, pos) { return `${tag.toLowerCase()}-${pos}`; }

        attributeChangedCallback(name, oldValue, newValue) { if (oldValue === newValue) return; if (name === 'as' && newValue !== 'lazy' && oldValue === 'lazy') return this.render(); const key = attrMap[name]; if (key && this.state) this.state[key] = toStateValue(key, newValue); }

        render(force = false) {
            if (!template) return;
            if (this._f & RENDERING) { this._f |= NEEDS_RERENDER; return; }
            this._f |= RENDERING;
            try {
              const version = this._version;
              if (!force && version === this._renderedVersion) { this._f &= ~(QUEUED|NEEDS_RERENDER); return; }
              if (!this.lightDOMChildren.length) this.lightDOMChildren = Array.from(this.children), this._lightById = new Map([...this.lightDOMChildren, ...this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []))].filter(c => c.id).map(c => [c.id, c]));
              const trigger = (eventName, detail) => { const full = `${tagName}.${eventName}`;[full, eventName].forEach(e => this.dispatchEvent(new CustomEvent(e, { detail, bubbles: true, composed: true }))); let data; try { data = jstr(detail); } catch { data = null; } window.postMessage({ eventName: full, detail: { sourceId: this.id, data } }, "*"); };
              const children = sel => sel ? this.lightDOMChildren.filter(c => c.tagName?.toLowerCase() === sel.toLowerCase() || c.matches?.(sel)) : this.lightDOMChildren;
              const result = template(this.state, trigger, { children, childElements: s => children(s).map(toElem) });
              if (!Array.isArray(result)) { console.warn(`pfusch: <${tagName}> template must return an array`); return; }
              const hasSlot = n => !!n && (n._t === 'slot' || Array.isArray(n) && n.some(hasSlot) || n._c?.some(hasSlot));
              const focusId = this.shadowRoot.activeElement?.id;

              if (!(this._f & STYLES_INJECTED)) { const gs = [...document.querySelectorAll(this.getAttribute("inject-styles") || "style[data-pfusch]")]; if (gs.length) { const sh = new CSSStyleSheet(); sh.replaceSync(gs.map(g => g.textContent || g.innerHTML).join("\n")); this.shadowRoot.adoptedStyleSheets = [sh, ...this.shadowRoot.adoptedStyleSheets]; } this._f |= STYLES_INJECTED; } // inject global styles once
              if (!(this._f & LINKS_CLONED)) { document.querySelectorAll(this.getAttribute("inject-links") || "link[data-pfusch]").forEach(l => this.shadowRoot.appendChild(l.cloneNode(true))); this._f |= LINKS_CLONED; }

              const elementItems = []; this._pos = 0;
              const mergeFromOriginal = (desc) => { const orig = desc._a.id && this._lightById?.get(desc._a.id); if (orig && orig.tagName.toLowerCase() === desc._t) { const tplKeys = new Set(Object.keys(desc._a)); Array.from(orig.attributes).forEach(a => { if (!tplKeys.has(a.name)) desc._a[a.name] = a.value; }); orig.classList.forEach(cls => { if (!desc._a.class?.split(' ').includes(cls)) desc._a.class = desc._a.class ? desc._a.class + ' ' + cls : cls; }); if ((orig instanceof HTMLInputElement || orig instanceof HTMLTextAreaElement) && !('value' in desc._a) && orig.value) desc._a.value = orig.value; } desc._c?.forEach(c => c?._t && mergeFromOriginal(c)); };
              const pushEl = desc => { if (!desc._a.id) desc._a.id = this.getStableId(desc._t, this._pos++); if (this._lightById.size) mergeFromOriginal(desc); elementItems.push(desc); };
              const processItem = i => { if (i == null || i === false) return; if (Array.isArray(i)) { i.forEach(processItem); return; } if (i._t) { pushEl(i); return; } const el = i.element || (isEl(i) ? i : null); if (el) { if (!el.id) el.id = this.getStableId(el.tagName, this._pos++); elementItems.push({ _el: el }); } else if (typeof i === 'string' || typeof i === 'number' || typeof i === 'bigint') pushEl({ _t: 'span', _a: {}, _c: [String(i)], _re: {} }); };

              result.forEach(item => {
                  if (item == null || item === false) return;
                  if (item.type === 'style') { const sheet = item.content(); if (!this.shadowRoot.adoptedStyleSheets.includes(sheet)) this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet]; }
                  else if (item.type === 'script' && !(this._f & SCRIPTS_EXEC)) { if (!this.lightDOMChildren.length && !this._lightDomRetryDone && result.some(hasSlot)) { this._lightDomRetryDone = true; setTimeout(() => { this._renderedVersion = -1; this.render(); }); return; } try { const cleanup = item.content.call({ component: this, shadowRoot: this.shadowRoot, state: this.state, addEventListener: this.addEventListener.bind(this), querySelector: s => this.shadowRoot.querySelector(s), querySelectorAll: s => this.shadowRoot.querySelectorAll(s) }); if (typeof cleanup === 'function') this._cleanups.push(cleanup); } catch (e) { console.error('Script error:', e); } this._f |= SCRIPTS_EXEC; }
                  else if (Array.isArray(item)) processItem(item);
                  else processItem(item);
              });

              this.syncChildren(this.shadowRoot, elementItems.filter(e => (e._t || e._el?.tagName || '').toUpperCase() !== 'LINK'));
              if (focusId) requestAnimationFrame(() => this.shadowRoot.getElementById(focusId)?.focus());
              this._renderedVersion = version; if (!(this._f & NEEDS_RERENDER) && this.hasAttribute('name')) this.#internals.setFormValue(jstr(this._raw));
              this._f &= ~RENDERING; if (this._f & QUEUED) this._f &= ~QUEUED; if (this._f & NEEDS_RERENDER) { this._f &= ~NEEDS_RERENDER; this.render(true); }
            } catch (e) { console.error(`pfusch: <${tagName}> render error:`, e); }
            finally { this._f &= ~(RENDERING|QUEUED); }
        }

        scheduleRender() { if (this._f & RENDERING) { this._f |= NEEDS_RERENDER; return; } if (this._f & QUEUED) return; this._f |= QUEUED; queueMicrotask(() => { if (!(this._f & QUEUED) || (this._f & RENDERING)) { this._f |= NEEDS_RERENDER; return; } this.render(); }); }

        syncChildren(parent, newChildren) {
            const old = Array.from(parent.children).filter(c => c.getAttribute('data-pfusch') === null), byId = new Map(old.filter(n => n.id).map(n => [n.id, n])), keep = new Set();
            const ensureId = (n, pos) => n._el ? (n._el.id || (n._el.id = this.getStableId(n._el.tagName, pos))) : (n._a.id || (n._a.id = this.getStableId(n._t, pos)));

            const syncListeners = (t, src) => { if (!src._re && !t._re) return; const fresh = !t._re; t._re ??= {}; const inc = src._re || {}; for (const [ev, h] of Object.entries(inc)) if (t._re[ev] !== h) { if (t._re[ev]) t.removeEventListener(ev, t._re[ev]); t.addEventListener(ev, t._re[ev] = h); } for (const ev of Object.keys(t._re)) if (!inc[ev]) { t.removeEventListener(ev, t._re[ev]); delete t._re[ev]; } if (fresh && inc.mount) t.dispatchEvent(new CustomEvent('mount')); };
            const syncAttrs = (t, src) => { const a = src._a || {}, seen = new Set(), n = t.tagName?.includes('-') ? k => String(k).toLowerCase() : k => String(k); for (const [k, v] of Object.entries(a)) { if (k === 'id' || typeof v === 'function') continue; const attr = n(k); if (isBoolAttrValue(k, v)) { if (v) { seen.add(attr); if (t.getAttribute(attr) !== 'true') t.setAttribute(attr, 'true'); } else if (t.hasAttribute(attr)) t.removeAttribute(attr); continue; } seen.add(attr); if (v == null) { if (t.hasAttribute(attr)) t.removeAttribute(attr); continue; } const sv = typeof v === o ? jstr(v) : String(v); if (t.getAttribute(attr) !== sv) t.setAttribute(attr, sv); } for (const at of Array.from(t.attributes)) { const attr = n(at.name); if (attr !== 'id' && !seen.has(attr)) t.removeAttribute(at.name); } };
            const syncProps = (t, src) => { const a = src._a || {}; boolAttrs.forEach(p => { if (!(p in a) || typeof a[p] !== 'boolean') return; if (a[p] !== t[p]) try { t[p] = a[p]; } catch {} }); if ('value' in a && !(document.activeElement === t || t.contains(document.activeElement)) && String(a.value) !== t.value) try { t.value = a.value; } catch {}; };

            const nx = (n, s) => { while (n && n.getAttribute?.('data-pfusch') != null) n = n[s]; return n; };
            const hasExit = n => !!(n._re?.exit || n.getAttribute?.('exit') != null), drop = async n => { const un = () => { if (n.nodeType === 1) this.lifecycle('unmount', n); }; if (n.nodeType !== 1 || !hasExit(n)) { n.remove(); return un(); } if (n.getAttribute('data-pfusch') !== null) return; const cls = n.getAttribute('exit'); n.setAttribute('data-pfusch', 'exit'); if (cls) n.classList.add(...cls.split(' ').filter(Boolean)); n.dispatchEvent(new CustomEvent('exit')); await Promise.allSettled((n.getAnimations?.({ subtree: true }) || []).filter(a => a.pending).map(a => a.finished)); n.remove(); un(); };
            const syncNodeChildren = (o, n) => {
                if (n._a?.keep) return; if (n._html !== undefined) { if (o.innerHTML !== n._html) o.innerHTML = n._html; return; }
                const newNodes = n._c || [];
                if (!newNodes.length) { if (o.firstChild) { const ch = Array.from(o.childNodes); ch.some(c => c.nodeType === 1) ? ch.forEach(drop) : (o.textContent = ''); } return; }
                const oldNodes = Array.from(o.childNodes).filter(c => c.getAttribute?.('data-pfusch') == null);
                if (oldNodes.length === newNodes.length && oldNodes.every((c, i) => { const d = newNodes[i]; return typeof d === 'string' ? c.nodeType === 3 : c.nodeType === 1 && c.tagName === (d._t?.toUpperCase() || d.element?.tagName || d.tagName) && (!d._a?.id || c.id == d._a.id); })) {
                    oldNodes.forEach((c, i) => { const d = newNodes[i]; typeof d === 'string' ? (c.textContent !== d && (c.textContent = d)) : d._t ? syncNode(c, d) : (c !== (d.element || d) && c.replaceWith(d.element || d)); });
                    return;
                }
                const textPool = [], elemById = new Map(), elemPools = new Map();
                for (const c of oldNodes)
                    if (c.nodeType === 3) textPool.push(c); else if (c.nodeType === 1) { if (c.id) elemById.set(String(c.id), c); else { const p = elemPools.get(c.tagName) || []; p.push(c); elemPools.set(c.tagName, p); } }
                let anchor = null, elIdx = 0;
                const place = node => { const ref = nx(anchor ? anchor.nextSibling : o.firstChild, 'nextSibling'); if (ref !== node) o.insertBefore(node, ref); anchor = node; };
                const resolved = newNodes.map(d => {
                    if (typeof d === 'string') { const r = textPool.shift(), t = r || document.createTextNode(d); if (r && r.textContent !== d) r.textContent = d; return t; }
                    if (!d._t) return d.element || d;
                    const tag = d._t.toUpperCase(); if (!d._a.id) d._a.id = `${d._t.toLowerCase()}-${elIdx}`; let t = elemById.get(String(d._a.id)); if (t) elemById.delete(String(d._a.id)); else { const p = elemPools.get(tag); if (p?.length) t = p.shift(); } elIdx++; return t ? syncNode(t, d) : toElement(d);
                });
                [textPool, ...elemById.values(), ...[...elemPools.values()].flat()].flat().forEach(n => { if (n?.parentNode === o) drop(n); }); resolved.forEach(place);
            };

            const syncNode = (o, n) => { if (n._el) { if (o !== n._el) { o.replaceWith(n._el); return n._el; } return o; } if (o.tagName !== n._t?.toUpperCase()) { const m = toElement(n); o.replaceWith(m); return m; } [syncListeners, syncAttrs, syncProps, syncNodeChildren].forEach(fn => fn(o, n)); return o; };
            const ordered = newChildren.map((n, idx) => { const id = ensureId(n, idx); const existing = byId.get(id); if (existing) byId.delete(id); const node = existing ? syncNode(existing, n) : parent.appendChild(n._el || toElement(n)); keep.add(node.id); return node; });
            old.forEach(c => { if (!keep.has(c.id)) drop(c); }); let anchor = null; for (const node of ordered) { if (!node.parentNode) continue; const ref = nx(anchor ? anchor.nextElementSibling : parent.firstElementChild, 'nextElementSibling'); if (ref !== node) parent.insertBefore(node, ref); anchor = node; }
        }
    }
    customElements.define(tagName, Pfusch);
    return Pfusch;
}
```
