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
        this.element.id ||= `${name.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
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
        if (args[0]?.raw) return new Element(key, str(args[0], ...args.slice(1)));
        
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
        static observedAttributes = ["id", "as", ...Object.keys(initialState).flatMap(k => [k, k.toLowerCase()])];
        
        constructor() {
            super();
            this.#internals = this.attachInternals();
            this.scriptsExecuted = false;
            this.subscribers = {};
            
            this.is = { ...initialState };
            for (const [k, v] of Object.entries(initialState)) {
                const attr = this.getAttribute(k) || this.getAttribute(k.toLowerCase());
                if (attr !== null) this.is[k] = json(attr);
            }
            
            this.lightDOMChildren = Array.from(this.children);
            this.attachShadow({ mode: 'open', serializable: true });
            
            this.state = new Proxy({ ...this.is }, {
                set: (target, key, value) => {
                    if (target[key] !== value) {
                        target[key] = value;
                        if (key !== "subscribe") {
                            this.render();
                            this.#internals.setFormValue(jstr(target));
                        }
                        (this.subscribers[key] || []).forEach(cb => cb(value));
                    }
                    return true;
                },
                get: (target, key) => key === 'subscribe' ? 
                    (prop, cb) => (this.subscribers[prop] ??= []).push(cb) : target[key]
            });
            
            if (this.getAttribute('as') !== 'lazy' || !this.shadowRoot.children.length) this.render();
        }

        #internals;

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            if (name === 'as' && newValue !== 'lazy' && oldValue === 'lazy') return this.render();
            const key = Object.keys(this.is).find(k => k === name || k.toLowerCase() === name);
            if (key && this.state) this.state[key] = json(newValue);
        }

        render() {
            if (!template) return;
            
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
            
            // Simple focus preservation
            const focused = this.shadowRoot.activeElement;
            const focusId = focused?.id;
            
            // Store styles before clearing
            const sheets = [...this.shadowRoot.adoptedStyleSheets];
            
            // Clear and rebuild
            this.shadowRoot.innerHTML = '';
            this.shadowRoot.adoptedStyleSheets = [];
            
            // Add global styles on first render
            const globalStyle = document.getElementById('pfusch-style');
            if (globalStyle && sheets.length === 0) {
                sheets.unshift(this.createSheet(globalStyle));
            }
            this.shadowRoot.adoptedStyleSheets = sheets;
            
            // Add data-pfusch links
            document.querySelectorAll('link[data-pfusch]').forEach(link => 
                this.shadowRoot.appendChild(link.cloneNode(true))
            );
            
            // Render content
            this.renderItems(result);
            
            // Restore focus
            if (focusId) {
                requestAnimationFrame(() => this.shadowRoot.getElementById(focusId)?.focus());
            }
        }
        
        renderItems(items) {
            (Array.isArray(items) ? items : [items]).forEach(item => {
                if (!item) return;
                if (item.type === 'style') {
                    this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, item.content()];
                } else if (item.type === 'script' && !this.scriptsExecuted) {
                    try {
                        item.content.call({
                            component: this, shadowRoot: this.shadowRoot, state: this.state,
                            addEventListener: this.addEventListener.bind(this),
                            querySelector: s => this.shadowRoot.querySelector(s),
                            querySelectorAll: s => this.shadowRoot.querySelectorAll(s)
                        });
                    } catch (e) { console.error('Script execution error:', e); }
                    this.scriptsExecuted = true;
                } else if (item?.element || item instanceof Element) {
                    this.shadowRoot.appendChild(item.element || item);
                } else if (Array.isArray(item)) {
                    this.renderItems(item);
                } else if (typeof item === 'string') {
                    this.shadowRoot.appendChild(document.createTextNode(item));
                }
            });
        }
        
        createSheet(styleEl) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(styleEl.textContent || styleEl.innerHTML);
            return sheet;
        }
    }
    
    customElements.define(tagName, Pfusch);
    return Pfusch;
}