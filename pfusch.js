const s = 'string', o = 'object';
const json = j => { try { return j && typeof j === s ? JSON.parse(j) : j; } catch { return j; } };
const jstr = JSON.stringify;
const str = (string, ...tags) => typeof string === s ? string : string.reduce((acc, part, i) => acc + part + (tags[i] || ''), '');

export const css = (style, ...tags) => ({ type: 'style', content: () => { const sheet = new CSSStyleSheet(); sheet.replaceSync(str(style, ...tags)); return sheet; } });
export const script = js => ({ type: 'script', content: js });

const addAttr = (el) => ([k, v]) => {
    if (+k == k) return;
    if (typeof v === 'function') {
        el._re ??= [];
        if (el._re.indexOf(k) < 0) {
            el.addEventListener(k, v);
            el._re.push(k);
        }
    } else if (typeof v === o && el.state) {
        el.state[k] = v;
    } else {
        if (k in el) {
            el[k] = v;
        } else {
            el.setAttribute(k, typeof v === o ? jstr(v) : v);
        }
    }
};

export const toElem = node => node instanceof Element ? node : node instanceof HTMLElement ? { element: node } : node.nodeType === 3 ? node.textContent : node;

class Element {
    constructor(name, ...rest) {
        this.element = document.createElement(name);
        this.state = rest[0] || {};
        rest.forEach((item, i) => this.add(item, () => rest.slice(i + 1)));
        // ID will be assigned by the component's stable ID system if needed
    }
    add(option, ah = () => []) {
        if (!option) return this;
        const t = typeof option;
        if (t === 'string') this.element.appendChild(document.createTextNode(option));
        else if (Array.isArray(option)) option.forEach(c => this.add(c, ah));
        else if (option.raw) this.element.innerHTML = str(option, ...ah());
        else if (option.element || option instanceof HTMLElement) this.element.appendChild(option.element || option);
        else if (t === o) Object.entries(option).forEach(addAttr(this.element));
        return this;
    }
}

export const html = new Proxy({}, {
    get: (_, key) => (...args) => {
            if (key === 'raw') {
                // html.raw(content) will return an object that sets innerHTML
                return (content) => ({
                    element: Object.assign(document.createElement('span'), { innerHTML: content })
                });
            }

            if (key.includes('-') || customElements.get(key)) {
                const el = document.createElement(key);
                const [attrs, ...children] = args[0] && typeof args[0] === o && !Array.isArray(args[0]) ? args : [{}, ...args];

                Object.entries(attrs).forEach(([k, v]) =>
                    el[typeof v === 'function' ? 'addEventListener' : 'setAttribute'](k, typeof v === o ? jstr(v) : v)
                );

                children.forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c?.element || c));
                return { element: el };
            }

            return new Element(key, ...args);
    }
});

export function pfusch(tagName, initialState, template) {
    if (!template) [template, initialState] = [initialState, {}];

    class Pfusch extends HTMLElement {
        static formAssociated = true;
        static observedAttributes = ["id", "as", "inject-styles", "inject-links", ...Object.keys(initialState).flatMap(k => [k, k.toLowerCase()])];

        constructor() {
            super();
            this.#internals = this.attachInternals();
            // Bit flags to reduce property bloat:
            // 1 scriptsExecuted, 2 globalStyleInjected, 4 linksCloned, 8 isRendering, 16 needsRerender, 32 initializing, 64 renderQueued
            this._f = 32; // start with initializing only
            this._subs = {};
            this._ids = new Map();

            this.is = { ...initialState };
            for (const [k, v] of Object.entries(initialState)) {
                const attr = this.getAttribute(k) || this.getAttribute(k.toLowerCase());
                if (attr !== null) this.is[k] = json(attr);
            }

            this.lightDOMChildren = Array.from(this.children);
            // Include descendants with ids for deeper hydration (e.g., form controls inside wrapper)
            const descendantsWithId = this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []));
            const all = [...this.lightDOMChildren, ...descendantsWithId];
            this._lightById = new Map(all.filter(c => c.id).map(c => [c.id, c]));
            this._hydrating = true; // allow adoption during first render
            this.attachShadow({ mode: 'open', serializable: true });

            this.state = new Proxy({ ...this.is }, {
                set: (target, key, value) => {
                    if (target[key] !== value) {
                        target[key] = value;
                        if (key !== "subscribe" && !(this._f & 32)) {
                            this.scheduleRender();
                            this.#internals.setFormValue(jstr(target));
                        }
                        (this._subs[key] || []).forEach(cb => cb(value));
                    }
                    return true;
                },
                get: (target, key) => key === 'subscribe' ?
                    (prop, cb) => { (this._subs[prop] ??= []).push(cb); try { cb(target[prop]); } catch { } return () => { const a = this._subs[prop]; if (a) this._subs[prop] = a.filter(f => f !== cb); }; } : target[key]
            });
            // Initial render will occur in connectedCallback after attributes are applied.
        }

        connectedCallback() {
            if (this._f & 32) { // initializing
                this._f &= ~32;
                if (this.getAttribute('as') !== 'lazy' || !this.shadowRoot.children.length) this.render();
            }
        }

        disconnectedCallback() {
            // Allow scripts to listen for cleanup
            this.dispatchEvent(new CustomEvent('disconnected', { bubbles: false }));
        }

        #internals;

        getStableId(tagName, position) {
            const sig = `${tagName}-${position}`;
            if (!this._ids.has(sig)) this._ids.set(sig, `${tagName.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`);
            return this._ids.get(sig);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            if (name === 'as' && newValue !== 'lazy' && oldValue === 'lazy') return this.render();
            const key = Object.keys(this.is).find(k => k === name || k.toLowerCase() === name);
            if (key && this.state) this.state[key] = json(newValue);
        }

        render() {
            if (!template) return;
            if (this._f & 8) { // already rendering
                this._f |= 16;
                return;
            }
            this._f |= 8;

            const trigger = (eventName, detail) => {
                const fullEventName = `${tagName}.${eventName}`;
                this.dispatchEvent(new CustomEvent(fullEventName, { detail, bubbles: true }));
                this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
                window.postMessage({ eventName: fullEventName, detail: { sourceId: this.is.id, data: jstr(detail) } }, "*");
            };

            const children = selector => selector ?
                this.lightDOMChildren.filter(c => c.tagName?.toLowerCase() === selector.toLowerCase() || c.matches?.(selector)) :
                this.lightDOMChildren;

            const result = template(this.state, trigger, { children, childElements: s => children(s).map(toElem) });
            if (!Array.isArray(result)) return;
            // Focus preservation
            const focused = this.shadowRoot.activeElement;
            const focusId = focused?.id;

            if (!(this._f & 2)) { // global style inject once
                const gs = [...document.querySelectorAll(this.getAttribute("inject-styles") || "style[data-pfusch]")];
                if (gs) { const sh = new CSSStyleSheet(); sh.replaceSync(gs.map(g => g.textContent || g.innerHTML).join("\n")); this.shadowRoot.adoptedStyleSheets = [sh, ...this.shadowRoot.adoptedStyleSheets]; }
                this._f |= 2;
            }

            // Clone data-pfusch links once
            if (!(this._f & 4)) {
                document.querySelectorAll(this.getAttribute("inject-links") || "link[data-pfusch]").forEach(link =>
                    this.shadowRoot.appendChild(link.cloneNode(true))
                );
                this._f |= 4;
            }

            // Collect element items (exclude style/script for diffing)
            const elementItems = [];
            this._pos = 0;
            result.forEach(item => {
                if (!item) return;
                if (item.type === 'style') {
                    const sheet = item.content();
                    if (!this.shadowRoot.adoptedStyleSheets.includes(sheet)) {
                        this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet];
                    }
                } else if (item.type === 'script') {
                    if (!(this._f & 1)) {
                        try {
                            item.content.call({
                                component: this, shadowRoot: this.shadowRoot, state: this.state,
                                addEventListener: this.addEventListener.bind(this),
                                querySelector: s => this.shadowRoot.querySelector(s),
                                querySelectorAll: s => this.shadowRoot.querySelectorAll(s)
                            });
                        } catch (e) { console.error('Script execution error:', e); }
                        this._f |= 1;
                    }
                } else {
                    const mergeFromOriginal = (tplNode) => {
                        if (!this._lightById) return;
                        const orig = tplNode.id && this._lightById.get(tplNode.id);
                        if (orig && orig.tagName === tplNode.tagName) {
                            // Merge attributes: template wins, but retain originals not specified (to keep classes etc.)
                            const tplAttrNames = new Set(Array.from(tplNode.attributes).map(a => a.name));
                            // Add original attributes missing from template
                            Array.from(orig.attributes).forEach(a => { if (!tplAttrNames.has(a.name)) tplNode.setAttribute(a.name, a.value); });
                            // Special handling for class: union
                            if (orig.classList.length) {
                                orig.classList.forEach(cls => tplNode.classList.add(cls));
                            }
                            // Preserve current input value if template didn't specify value attribute
                            if (orig instanceof HTMLInputElement || orig instanceof HTMLTextAreaElement) {
                                if (!tplNode.hasAttribute('value') && orig.value && !tplNode.value) tplNode.value = orig.value;
                            }
                        }
                        // Recurse for children with ids
                        tplNode.querySelectorAll?.('[id]').forEach(child => mergeFromOriginal(child));
                    };
                    const pushEl = el => {
                        if (!el.id) el.id = this.getStableId(el.tagName, this._pos++);
                        mergeFromOriginal(el);
                        elementItems.push(el);
                    };
                    if (Array.isArray(item)) {
                        item.forEach(i => {
                            if (!i) return;
                            if (i?.element || i instanceof Element) pushEl(i.element || i);
                            else if (typeof i === 'string') { const span = document.createElement('span'); span.textContent = i; pushEl(span); }
                        });
                    } else if (item?.element || item instanceof Element) {
                        pushEl(item.element || item);
                    } else if (typeof item === 'string') {
                        const span = document.createElement('span'); span.textContent = item; pushEl(span);
                    }
                }
            });

            // Diff/patch shadowRoot children (excluding link elements added earlier)
            this.syncChildren(this.shadowRoot, elementItems.filter(e => e.tagName !== 'LINK'));

            // Restore focus if possible
            if (focusId) {
                requestAnimationFrame(() => this.shadowRoot.getElementById(focusId)?.focus());
            }

            this._f &= ~8;                // clear rendering
            if (this._hydrating) this._hydrating = false; // hydration done after first successful render
            if (this._f & 64) this._f &= ~64; // clear queued flag
            if (this._f & 16) {            // needs rerender?
                this._f &= ~16;
                this.render();             // apply queued state changes
            }
        }

        scheduleRender() {
            // Batch multiple state changes in same tick & avoid mid-event input value clobbering
            if (this._f & 8) { this._f |= 16; return; }
            if (this._f & 64) return;
            this._f |= 64;
            queueMicrotask(() => {
                if (!(this._f & 64)) return; // already rendered
                if (this._f & 8) { this._f |= 16; return; }
                this.render();
            });
        }

        syncChildren(parent, newChildren) {
            const old = Array.from(parent.children).filter(c => c.getAttribute('data-pfusch') === null);
            const byId = new Map(old.map(c => [c.id, c]));
            const keep = new Set();
            const props = ['checked', 'selected', 'disabled', 'readonly', 'multiple'];
            const upd = (o, n) => {
                if (o.tagName !== n.tagName) { o.replaceWith(n); return; }
                for (const a of n.attributes) { if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value); }
                for (const a of Array.from(o.attributes)) { if (a.name !== 'id' && !n.hasAttribute(a.name)) o.removeAttribute(a.name); }
                for (const p of props) { if (n[p] !== undefined && n[p] !== o[p]) { try { o[p] = n[p]; } catch { } } }
                if ('value' in n) {
                    const isIn = /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName);
                    const explicit = n.hasAttribute && n.hasAttribute('value');
                    const active = document.activeElement === o || o.contains(document.activeElement);
                    if ((explicit || !isIn) && n.value !== o.value && !active) { try { o.value = n.value; } catch { } }
                }
                const oc = Array.from(o.children), nc = Array.from(n.children);
                if (!nc.length && !oc.length) { if (o.textContent !== n.textContent) o.textContent = n.textContent; return; }
                nc.forEach((c, i) => {
                    let ex = oc[i];
                    if (!c.id) c.id = ex?.id || this.getStableId(c.tagName, i);
                    if (ex) upd(ex, c); else o.appendChild(c);
                });
                if (oc.length > nc.length) oc.slice(nc.length).forEach(e => e.remove());
            };
            newChildren.forEach(n => {
                const ex = n.id && byId.get(n.id);
                if (ex) { upd(ex, n); keep.add(ex.id); } else { parent.appendChild(n); keep.add(n.id); }
            });
            old.forEach(c => { if (!keep.has(c.id)) c.remove(); });
            // Reorder to match newChildren
            let prev = null; newChildren.forEach(n => { const node = (n.id && byId.get(n.id)) || n; if (!node.parentNode) return; if (!prev) { if (parent.firstElementChild !== node) parent.insertBefore(node, parent.firstElementChild); } else if (prev.nextElementSibling !== node) { parent.insertBefore(node, prev.nextElementSibling); } prev = node; });
        }
    }

    customElements.define(tagName, Pfusch);
    return Pfusch;
}