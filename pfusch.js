const s = 'string', o = 'object', jstr = JSON.stringify, cssCache = new Map(), formProps = ['checked', 'selected', 'disabled', 'readonly', 'multiple'];
const json = j => { try { return j && typeof j === s ? JSON.parse(j) : j; } catch { return j; } };
const str = (string, ...tags) => typeof string === s ? string : string.reduce((acc, part, i) => acc + part + (tags[i] || ''), '');
const isEl = n => n && (n.nodeType === 1 || (typeof window !== 'undefined' && window.Element && n instanceof window.Element));

export const css = (style, ...tags) => { const cssText = str(style, ...tags); let sheet; return { type: 'style', content: () => sheet || (sheet = cssCache.get(cssText) || (cssCache.set(cssText, sheet = new CSSStyleSheet()), sheet.replaceSync(cssText), sheet)) }; };
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
        if (!option) return this;
        const t = typeof option;
        if (t === 'string') this._c.push(option);
        else if (Array.isArray(option)) option.forEach(c => this.add(c, ah));
        else if (option.raw) this._html = str(option, ...ah());
        else if (option.element || option instanceof HTMLElement) this._c.push(option);
        else if (option._t) this._c.push(option);
        else if (t === o) Object.entries(option).forEach(([k, v]) => { if (+k == k) return; if (typeof v === 'function') this._re[k] = v; else this._a[k] = v; });
        return this;
    }
}

const toElem = node => node?._t ? node : (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) ? { element: node } : node?.nodeType === 3 ? node.textContent : node;
export const toElement = (desc) => { const el = document.createElement(desc._t); for (const [k, v] of Object.entries(desc._a)) if (typeof v !== 'function' && v != null) { if (k === 'checked') { if (v) el.setAttribute(k, ''); } else el.setAttribute(k, typeof v === o ? jstr(v) : String(v)); } for (const [k, h] of Object.entries(desc._re)) { el._re ??= {}; el.addEventListener(k, el._re[k] = h); } if (desc._html !== undefined) { el.innerHTML = desc._html; return el; } for (const c of desc._c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c._t ? toElement(c) : c.element || c); return el; };

export const html = new Proxy({}, {
    get: (_, key) => (...args) => {
        if (key === 'raw') return (content) => ({ _t: 'span', _a: {}, _c: [], _re: {}, _html: content });
        return new Element(key, ...args);
    }
});

export function pfusch(tagName, initialState, template) {
    if (!template) [template, initialState] = [initialState, {}];
    const attrMap = Object.fromEntries(Object.keys(initialState).flatMap(k => [[k, k], [k.toLowerCase(), k], [k.replace(/[A-Z]/g, "-$&").toLowerCase(), k]]));

    class Pfusch extends HTMLElement {
        static formAssociated = true;
        static observedAttributes = ["id", "as", "inject-styles", "inject-links", ...Object.keys(initialState).flatMap(k => [k, k.toLowerCase(), k.replace(/[A-Z]/g, "-$&").toLowerCase()])];
        #internals;

        get internals() { return this.#internals; }

        constructor() {
            super();
            this.#internals = this.attachInternals();
            this._f = 32; this._subs = {}; this._ids = new Map(); // bits: 1=scriptsExec 2=stylesInj 4=linksCloned 8=rendering 16=needsRerender 32=init 64=queued
            this.lightDOMChildren = Array.from(this.children);
            this._lightById = new Map([...this.lightDOMChildren, ...this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []))].filter(c => c.id).map(c => [c.id, c]));
            this._lightDomRetryDone = false;
            this.attachShadow({ mode: 'open', serializable: true });
            this._raw = { ...initialState };
            for (const k of Object.keys(initialState)) { const v = this.getAttribute(k) || this.getAttribute(k.toLowerCase()) || this.getAttribute(k.replace(/[A-Z]/g, "-$&").toLowerCase()); if (v !== null) this._raw[k] = json(v); }
            this.state = new Proxy(this._raw, {
                set: (target, key, value) => { if (target[key] !== value) { target[key] = value; if (key !== "subscribe" && !(this._f & 32)) { this.scheduleRender(); } (this._subs[key] || []).forEach(cb => cb(value)); } return true; },
                get: (target, key) => key === 'subscribe' ? (prop, cb) => { (this._subs[prop] ??= []).push(cb); try { cb(target[prop]); } catch { } return () => { const a = this._subs[prop]; if (a) this._subs[prop] = a.filter(f => f !== cb); }; } : target[key]
            });
        }

        connectedCallback() { if (this._f & 32) { this._f &= ~32; if (this.getAttribute('as') !== 'lazy' || !this.shadowRoot.children.length) this.render(); } }
        disconnectedCallback() { this.dispatchEvent(new CustomEvent('disconnected', { bubbles: false })); } // cleanup event
        getStableId(tag, pos) { const sig = `${tag}-${pos}`; return this._ids.get(sig) || (this._ids.set(sig, `${tag.toLowerCase()}-${pos}`), `${tag.toLowerCase()}-${pos}`); }

        attributeChangedCallback(name, oldValue, newValue) { if (oldValue === newValue) return; if (name === 'as' && newValue !== 'lazy' && oldValue === 'lazy') return this.render(); const key = attrMap[name]; if (key && this.state) this.state[key] = json(newValue); }

        render(force = false) {
            if (!template) return;
            if (this._f & 8) { this._f |= 16; return; }
            const snap = jstr(this._raw);
            if (!force && snap === this._snap) { this._f &= ~(64|16); return; }
            this._f |= 8;
            if (!this.lightDOMChildren.length) this.lightDOMChildren = Array.from(this.children), this._lightById = new Map([...this.lightDOMChildren, ...this.lightDOMChildren.flatMap(c => Array.from(c.querySelectorAll?.('[id]') || []))].filter(c => c.id).map(c => [c.id, c]));
            const trigger = (eventName, detail) => { const full = `${tagName}.${eventName}`;[full, eventName].forEach(e => this.dispatchEvent(new CustomEvent(e, { detail, bubbles: true, composed: true }))); window.postMessage({ eventName: full, detail: { sourceId: this.id, data: jstr(detail) } }, "*"); };
            const children = sel => sel ? this.lightDOMChildren.filter(c => c.tagName?.toLowerCase() === sel.toLowerCase() || c.matches?.(sel)) : this.lightDOMChildren;
            const result = template(this.state, trigger, { children, childElements: s => children(s).map(toElem) });
            if (!Array.isArray(result)) return;
            const hasSlot = n => !!n && (n._t === 'slot' || Array.isArray(n) && n.some(hasSlot) || n._c?.some(hasSlot));
            const focusId = this.shadowRoot.activeElement?.id;

            if (!(this._f & 2)) { const gs = [...document.querySelectorAll(this.getAttribute("inject-styles") || "style[data-pfusch]")]; if (gs.length) { const sh = new CSSStyleSheet(); sh.replaceSync(gs.map(g => g.textContent || g.innerHTML).join("\n")); this.shadowRoot.adoptedStyleSheets = [sh, ...this.shadowRoot.adoptedStyleSheets]; } this._f |= 2; } // inject global styles once
            if (!(this._f & 4)) { document.querySelectorAll(this.getAttribute("inject-links") || "link[data-pfusch]").forEach(l => this.shadowRoot.appendChild(l.cloneNode(true))); this._f |= 4; }

            const elementItems = []; this._pos = 0;
            const mergeFromOriginal = (desc) => { const orig = desc._a.id && this._lightById?.get(desc._a.id); if (orig && orig.tagName.toLowerCase() === desc._t) { const tplKeys = new Set(Object.keys(desc._a)); Array.from(orig.attributes).forEach(a => { if (!tplKeys.has(a.name)) desc._a[a.name] = a.value; }); orig.classList.forEach(cls => { if (!desc._a.class?.split(' ').includes(cls)) desc._a.class = desc._a.class ? desc._a.class + ' ' + cls : cls; }); if ((orig instanceof HTMLInputElement || orig instanceof HTMLTextAreaElement) && !('value' in desc._a) && orig.value) desc._a.value = orig.value; } desc._c?.forEach(c => c?._t && mergeFromOriginal(c)); };
            const pushEl = desc => { if (!desc._a.id) desc._a.id = this.getStableId(desc._t, this._pos++); if (this._lightById.size) mergeFromOriginal(desc); elementItems.push(desc); };
            const processItem = i => { if (!i) return; if (i._t) { pushEl(i); return; } const el = i.element || (isEl(i) ? i : null); if (el) { if (!el.id) el.id = this.getStableId(el.tagName, this._pos++); elementItems.push({ _el: el }); } else if (typeof i === 'string') pushEl({ _t: 'span', _a: {}, _c: [i], _re: {} }); };

            result.forEach(item => {
                if (!item) return;
                if (item.type === 'style') { const sheet = item.content(); if (!this.shadowRoot.adoptedStyleSheets.includes(sheet)) this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet]; }
                else if (item.type === 'script' && !(this._f & 1)) { if (!this.lightDOMChildren.length && !this._lightDomRetryDone && result.some(hasSlot)) { this._lightDomRetryDone = true; setTimeout(() => { this._snap = undefined; this.render(); }); return; } try { item.content.call({ component: this, shadowRoot: this.shadowRoot, state: this.state, addEventListener: this.addEventListener.bind(this), querySelector: s => this.shadowRoot.querySelector(s), querySelectorAll: s => this.shadowRoot.querySelectorAll(s) }); } catch (e) { console.error('Script error:', e); } this._f |= 1; }
                else if (Array.isArray(item)) item.forEach(processItem);
                else processItem(item);
            });

            this.syncChildren(this.shadowRoot, elementItems.filter(e => (e._t || e._el?.tagName || '').toUpperCase() !== 'LINK'));
            if (focusId) requestAnimationFrame(() => this.shadowRoot.getElementById(focusId)?.focus());
            this.#internals.setFormValue(this._snap = (this._f & 16 ? jstr(this._raw) : snap));
            this._f &= ~8; if (this._f & 64) this._f &= ~64; if (this._f & 16) { this._f &= ~16; this.render(true); }
        }

        scheduleRender() { if (this._f & 8) { this._f |= 16; return; } if (this._f & 64) return; this._f |= 64; queueMicrotask(() => { if (!(this._f & 64) || (this._f & 8)) { this._f |= 16; return; } this.render(); }); }

        syncChildren(parent, newChildren) {
            const old = Array.from(parent.children).filter(c => c.getAttribute('data-pfusch') === null), byId = new Map(old.filter(n => n.id).map(n => [n.id, n])), keep = new Set();
            const ensureId = (n, pos) => n._el ? (n._el.id || (n._el.id = this.getStableId(n._el.tagName, pos))) : (n._a.id || (n._a.id = this.getStableId(n._t, pos)));

            const syncListeners = (t, src) => { if (!src._re && !t._re) return; t._re ??= {}; const inc = src._re || {}; for (const [ev, h] of Object.entries(inc)) if (t._re[ev] !== h) { if (t._re[ev]) t.removeEventListener(ev, t._re[ev]); t.addEventListener(ev, t._re[ev] = h); } for (const ev of Object.keys(t._re)) if (!inc[ev]) { t.removeEventListener(ev, t._re[ev]); delete t._re[ev]; } };
            const syncAttrs = (t, src) => { const a = src._a || {}, seen = new Set(); for (const [k, v] of Object.entries(a)) { if (k === 'id' || typeof v === 'function') continue; if (k === 'checked') { if (v) { seen.add(k); if (!t.hasAttribute(k)) t.setAttribute(k, ''); } else if (t.hasAttribute(k)) t.removeAttribute(k); continue; } seen.add(k); const sv = typeof v === o ? jstr(v) : String(v); if (t.getAttribute(k) !== sv) t.setAttribute(k, sv); } for (const at of Array.from(t.attributes)) if (at.name !== 'id' && !seen.has(at.name)) t.removeAttribute(at.name); };
            const syncProps = (t, src) => { const a = src._a || {}; formProps.forEach(p => { if (p in a && a[p] !== t[p]) try { t[p] = a[p]; } catch {} }); if ('value' in a && !(document.activeElement === t || t.contains(document.activeElement)) && String(a.value) !== t.value) try { t.value = a.value; } catch {}; };

            const syncNodeChildren = (o, n) => {
                if (n._html !== undefined) { if (o.innerHTML !== n._html) o.innerHTML = n._html; return; }
                const newNodes = n._c || [];
                if (!newNodes.length) { if (o.firstChild) o.textContent = ''; return; }
                const oldNodes = Array.from(o.childNodes);
                if (oldNodes.length === newNodes.length && oldNodes.every((c, i) => { const d = newNodes[i]; return typeof d === 'string' ? c.nodeType === 3 : c.nodeType === 1 && c.tagName === (d._t?.toUpperCase() || d.element?.tagName || d.tagName); })) {
                    oldNodes.forEach((c, i) => { const d = newNodes[i]; typeof d === 'string' ? (c.textContent !== d && (c.textContent = d)) : d._t ? syncNode(c, d) : (c !== (d.element || d) && c.replaceWith(d.element || d)); });
                    return;
                }
                const textPool = [], elemById = new Map(), elemPools = new Map();
                for (const c of Array.from(o.childNodes))
                    if (c.nodeType === 3) textPool.push(c); else if (c.nodeType === 1) { if (c.id) elemById.set(c.id, c); else { const p = elemPools.get(c.tagName) || []; p.push(c); elemPools.set(c.tagName, p); } }
                let anchor = null, elIdx = 0;
                const place = node => { if (anchor) { if (anchor.nextSibling !== node) o.insertBefore(node, anchor.nextSibling); } else if (o.firstChild !== node) o.insertBefore(node, o.firstChild); anchor = node; };
                newNodes.forEach(d => {
                    if (typeof d === 'string') { const r = textPool.shift(), t = r || document.createTextNode(d); if (r && r.textContent !== d) r.textContent = d; place(t); return; }
                    if (d._t) { const tag = d._t.toUpperCase(); if (!d._a.id) d._a.id = `${d._t.toLowerCase()}-${elIdx}`; let t = elemById.get(d._a.id); if (t) elemById.delete(d._a.id); else { const p = elemPools.get(tag); if (p?.length) t = p.shift(); } place(t ? syncNode(t, d) : toElement(d)); elIdx++; }
                    else { const el = d.element || d; place(el); }
                });
                [textPool, ...elemById.values(), ...[...elemPools.values()].flat()].flat().forEach(n => { if (n?.parentNode === o) n.remove(); });
            };

            const syncNode = (o, n) => { if (n._el) { if (o !== n._el) { o.replaceWith(n._el); return n._el; } return o; } if (o.tagName !== n._t?.toUpperCase()) { const m = toElement(n); o.replaceWith(m); return m; } [syncListeners, syncAttrs, syncProps, syncNodeChildren].forEach(fn => fn(o, n)); return o; };
            const ordered = newChildren.map((n, idx) => { const id = ensureId(n, idx); const existing = byId.get(id); if (existing) byId.delete(id); const node = existing ? syncNode(existing, n) : parent.appendChild(n._el || toElement(n)); keep.add(node.id); return node; });
            old.forEach(c => { if (!keep.has(c.id)) c.remove(); }); let anchor = null; for (const node of ordered) { if (!node.parentNode) continue; if (anchor ? anchor.nextElementSibling !== node : parent.firstElementChild !== node) parent.insertBefore(node, anchor?.nextElementSibling || parent.firstElementChild); anchor = node; }
        }
    }
    customElements.define(tagName, Pfusch);
    return Pfusch;
}
