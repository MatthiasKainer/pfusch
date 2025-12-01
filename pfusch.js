const s = 'string', o = 'object', jstr = JSON.stringify, cssCache = new Map(), formProps = ['checked', 'selected', 'disabled', 'readonly', 'multiple'];
const json = j => { try { return j && typeof j === s ? JSON.parse(j) : j; } catch { return j; } };
const str = (string, ...tags) => typeof string === s ? string : string.reduce((acc, part, i) => acc + part + (tags[i] || ''), '');
const isEl = n => n && (n instanceof Element || (typeof window !== 'undefined' && window.Element && n instanceof window.Element) || (n.nodeType === 1));

export const css = (style, ...tags) => { const cssText = str(style, ...tags); let sheet; return { type: 'style', content: () => sheet || (sheet = cssCache.get(cssText) || (cssCache.set(cssText, sheet = new CSSStyleSheet()), sheet.replaceSync(cssText), sheet)) }; };
export const script = js => ({ type: 'script', content: js });

const addAttr = (el) => ([k, v]) => { if (+k == k) return; if (typeof v === 'function') { el._re ??= {}; if (el._re[k]) el.removeEventListener(k, el._re[k]); el.addEventListener(k, el._re[k] = v); } else if (typeof v === o && el.state) el.state[k] = v; else if (k in el) el[k] = v; else el.setAttribute(k, typeof v === o ? jstr(v) : v); };

export const toElem = node => node instanceof Element ? node : (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) ? { element: node } : node?.nodeType === 3 ? node.textContent : node;

class Element {
    constructor(name, ...rest) { this.element = document.createElement(name); this.state = rest[0] || {}; rest.forEach((item, i) => this.add(item, () => rest.slice(i + 1))); }
    add(option, ah = () => []) { if (!option) return this; const t = typeof option; if (t === 'string') this.element.appendChild(document.createTextNode(option)); else if (Array.isArray(option)) option.forEach(c => this.add(c, ah)); else if (option.raw) this.element.innerHTML = str(option, ...ah()); else if (option.element || option instanceof HTMLElement) this.element.appendChild(option.element || option); else if (t === o) Object.entries(option).forEach(addAttr(this.element)); return this; }
}

export const html = new Proxy({}, {
    get: (_, key) => (...args) => {
        if (key === 'raw') return (content) => ({ element: Object.assign(document.createElement('span'), { innerHTML: content }) });
        if (key.includes('-') || customElements.get(key)) { const el = document.createElement(key), [attrs, ...children] = args[0] && typeof args[0] === o && !Array.isArray(args[0]) ? args : [{}, ...args]; Object.entries(attrs).forEach(([k, v]) => el[typeof v === 'function' ? 'addEventListener' : 'setAttribute'](k, typeof v === o ? jstr(v) : v)); children.forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c?.element || c)); return { element: el }; }
        return new Element(key, ...args);
    }
});

export function pfusch(tagName, initialState, template) {
    if (!template) [template, initialState] = [initialState, {}];

    class Pfusch extends HTMLElement {
        static formAssociated = true;
        static observedAttributes = ["id", "as", "inject-styles", "inject-links", ...Object.keys(initialState).flatMap(k => [k, k.toLowerCase()])];
        #internals;

        constructor() {
            super();
            this.#internals = this.attachInternals();
            this._f = 32; this._subs = {}; this._ids = new Map(); // bits: 1=scriptsExec 2=stylesInj 4=linksCloned 8=rendering 16=needsRerender 32=init 64=queued
            this.is = { ...initialState };
            for (const [k] of Object.entries(initialState)) { const attr = this.getAttribute(k) || this.getAttribute(k.toLowerCase()); if (attr !== null) this.is[k] = json(attr); }
            this.lightDOMChildren = Array.from(this.children); this._hydrating = true;
            this._lightById = new Map([...this.lightDOMChildren, ...this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []))].filter(c => c.id).map(c => [c.id, c]));
            this.attachShadow({ mode: 'open', serializable: true });
            this.state = new Proxy({ ...this.is }, {
                set: (target, key, value) => { if (target[key] !== value) { target[key] = value; if (key !== "subscribe" && !(this._f & 32)) { this.scheduleRender(); this.#internals.setFormValue(jstr(target)); } (this._subs[key] || []).forEach(cb => cb(value)); } return true; },
                get: (target, key) => key === 'subscribe' ? (prop, cb) => { (this._subs[prop] ??= []).push(cb); try { cb(target[prop]); } catch { } return () => { const a = this._subs[prop]; if (a) this._subs[prop] = a.filter(f => f !== cb); }; } : target[key]
            });
        }

        connectedCallback() { if (this._f & 32) { this._f &= ~32; if (this.getAttribute('as') !== 'lazy' || !this.shadowRoot.children.length) this.render(); } }
        disconnectedCallback() { this.dispatchEvent(new CustomEvent('disconnected', { bubbles: false })); } // cleanup event
        getStableId(tag, pos) { const sig = `${tag}-${pos}`; if (!this._ids.has(sig)) this._ids.set(sig, `${tag.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`); return this._ids.get(sig); }

        attributeChangedCallback(name, oldValue, newValue) { if (oldValue === newValue) return; if (name === 'as' && newValue !== 'lazy' && oldValue === 'lazy') return this.render(); const key = Object.keys(this.is).find(k => k === name || k.toLowerCase() === name); if (key && this.state) this.state[key] = json(newValue); }

        render() {
            if (!template) return;
            if (this._f & 8) { this._f |= 16; return; }
            this._f |= 8;
            const trigger = (eventName, detail) => { const full = `${tagName}.${eventName}`;[full, eventName].forEach(e => this.dispatchEvent(new CustomEvent(e, { detail, bubbles: true, composed: true }))); window.postMessage({ eventName: full, detail: { sourceId: this.is.id, data: jstr(detail) } }, "*"); };
            const children = sel => sel ? this.lightDOMChildren.filter(c => c.tagName?.toLowerCase() === sel.toLowerCase() || c.matches?.(sel)) : this.lightDOMChildren;
            const result = template(this.state, trigger, { children, childElements: s => children(s).map(toElem) });
            if (!Array.isArray(result)) return;
            const focusId = this.shadowRoot.activeElement?.id;

            if (!(this._f & 2)) { const gs = [...document.querySelectorAll(this.getAttribute("inject-styles") || "style[data-pfusch]")]; if (gs.length) { const sh = new CSSStyleSheet(); sh.replaceSync(gs.map(g => g.textContent || g.innerHTML).join("\n")); this.shadowRoot.adoptedStyleSheets = [sh, ...this.shadowRoot.adoptedStyleSheets]; } this._f |= 2; } // inject global styles once
            if (!(this._f & 4)) { document.querySelectorAll(this.getAttribute("inject-links") || "link[data-pfusch]").forEach(l => this.shadowRoot.appendChild(l.cloneNode(true))); this._f |= 4; }

            const elementItems = []; this._pos = 0;
            const mergeFromOriginal = (tplNode) => { const orig = tplNode.id && this._lightById?.get(tplNode.id); if (orig && orig.tagName === tplNode.tagName) { const tplAttrs = new Set(Array.from(tplNode.attributes).map(a => a.name)); Array.from(orig.attributes).forEach(a => { if (!tplAttrs.has(a.name)) tplNode.setAttribute(a.name, a.value); }); orig.classList.forEach(cls => tplNode.classList.add(cls)); if ((orig instanceof HTMLInputElement || orig instanceof HTMLTextAreaElement) && !tplNode.hasAttribute('value') && orig.value && !tplNode.value) tplNode.value = orig.value; } tplNode.querySelectorAll?.('[id]').forEach(mergeFromOriginal); };
            const pushEl = el => { if (!el.id) el.id = this.getStableId(el.tagName, this._pos++); mergeFromOriginal(el); elementItems.push(el); };
            const processItem = i => { if (!i) return; const el = i?.element || (isEl(i) ? i : null); if (el) pushEl(el); else if (typeof i === 'string') { const span = document.createElement('span'); span.textContent = i; pushEl(span); } };

            result.forEach(item => {
                if (!item) return;
                if (item.type === 'style') { const sheet = item.content(); if (!this.shadowRoot.adoptedStyleSheets.includes(sheet)) this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet]; }
                else if (item.type === 'script' && !(this._f & 1)) { try { item.content.call({ component: this, shadowRoot: this.shadowRoot, state: this.state, addEventListener: this.addEventListener.bind(this), querySelector: s => this.shadowRoot.querySelector(s), querySelectorAll: s => this.shadowRoot.querySelectorAll(s) }); } catch (e) { console.error('Script error:', e); } this._f |= 1; }
                else if (Array.isArray(item)) item.forEach(processItem);
                else processItem(item);
            });

            this.syncChildren(this.shadowRoot, elementItems.filter(e => e.tagName !== 'LINK'));
            if (focusId) requestAnimationFrame(() => this.shadowRoot.getElementById(focusId)?.focus());
            this._f &= ~8; this._hydrating = false; if (this._f & 64) this._f &= ~64; if (this._f & 16) { this._f &= ~16; this.render(); }
        }

        scheduleRender() { if (this._f & 8) { this._f |= 16; return; } if (this._f & 64) return; this._f |= 64; queueMicrotask(() => { if (!(this._f & 64) || (this._f & 8)) { this._f |= 16; return; } this.render(); }); }

        syncChildren(parent, newChildren) {
            const old = Array.from(parent.children).filter(c => c.getAttribute('data-pfusch') === null), byId = new Map(old.filter(n => n.id).map(n => [n.id, n])), keep = new Set();
            const ensureId = (el, pos) => el.id || (el.id = this.getStableId(el.tagName, pos));

            const syncListeners = (t, src) => { if (!src._re && !t._re) return; t._re ??= {}; const inc = src._re || {}; for (const [ev, h] of Object.entries(inc)) if (t._re[ev] !== h) { if (t._re[ev]) t.removeEventListener(ev, t._re[ev]); t.addEventListener(ev, t._re[ev] = h); } for (const ev of Object.keys(t._re)) if (!inc[ev]) { t.removeEventListener(ev, t._re[ev]); delete t._re[ev]; } };
            const syncAttrs = (t, src) => { const seen = new Set(); for (const a of src.attributes) if (a.name !== 'id') { seen.add(a.name); if (t.getAttribute(a.name) !== a.value) t.setAttribute(a.name, a.value); } for (const a of Array.from(t.attributes)) if (a.name !== 'id' && !seen.has(a.name)) t.removeAttribute(a.name); };
            const syncProps = (t, src) => { formProps.forEach(p => { if (src[p] !== undefined && src[p] !== t[p]) try { t[p] = src[p]; } catch { } }); if ('value' in src && !((/^(INPUT|TEXTAREA|SELECT)$/.test(src.tagName) && !(src.hasAttribute?.('value'))) || document.activeElement === t || t.contains(document.activeElement)) && src.value !== t.value) try { t.value = src.value; } catch { } };

            const syncNodeChildren = (o, n) => {
                const newNodes = Array.from(n.childNodes);
                if (!newNodes.length) { if (o.firstChild) o.textContent = ''; return; }
                const textPool = [], elemById = new Map(), elemPools = new Map();
                for (const c of Array.from(o.childNodes))
                    if (c.nodeType === 3) textPool.push(c); else if (c.nodeType === 1) { if (c.id) elemById.set(c.id, c); else { const p = elemPools.get(c.tagName) || []; p.push(c); elemPools.set(c.tagName, p); } }
                let anchor = null, elIdx = 0;
                const place = node => {
                    if (anchor) { if (anchor.nextSibling !== node) o.insertBefore(node, anchor.nextSibling); }
                    else if (o.firstChild !== node) o.insertBefore(node, o.firstChild); anchor = node;
                };
                newNodes.forEach(c => {
                    if (c.nodeType === 3) {
                        const r = textPool.shift(), t = r || document.createTextNode(c.textContent);
                        if (r && r.textContent !== c.textContent) r.textContent = c.textContent;
                        place(t); return;
                    }
                    if (c.nodeType === 1) {
                        ensureId(c, elIdx++);
                        let t = elemById.get(c.id);
                        if (t) elemById.delete(c.id);
                        else { const p = elemPools.get(c.tagName); if (p?.length) t = p.shift(); } place(t ? syncNode(t, c) : c);
                    }
                });
                [textPool, ...elemById.values(), ...[...elemPools.values()].flat()].flat().forEach(n => { if (n?.parentNode === o) n.remove(); });
            };

            const syncNode = (o, n) => { if (o.tagName !== n.tagName) { o.replaceWith(n); return n; } [syncListeners, syncAttrs, syncProps, syncNodeChildren].forEach(fn => fn(o, n)); return o; };
            const ordered = newChildren.map((n, idx) => { const id = ensureId(n, idx), existing = byId.get(id); if (existing) byId.delete(id); const node = existing ? syncNode(existing, n) : parent.appendChild(n); keep.add(node.id); return node; });
            old.forEach(c => { if (!keep.has(c.id)) c.remove(); }); let anchor = null; for (const node of ordered) { if (!node.parentNode) continue; if (anchor ? anchor.nextElementSibling !== node : parent.firstElementChild !== node) parent.insertBefore(node, anchor?.nextElementSibling || parent.firstElementChild); anchor = node; }
        }
    }
    customElements.define(tagName, Pfusch);
    return Pfusch;
}
