const s = 'string';
const o = 'object';
function json(jsonString) {
    try {
        return (!(jsonString && typeof jsonString === s)) ? jsonString : JSON.parse(jsonString);
    } catch (error) {
        return jsonString;
    }
}

const jstr = (obj) => JSON.stringify(obj);

const str = (string, ...tags) =>
    (typeof string === s) ? string : string.reduce((acc, part, i) => {
        return acc + part + (tags[i] || '');
    }, '');

export function css(style, ...tags) {
    return {
        type: 'style',
        content: () => {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(str(style, ...tags));
            return sheet;
        }
    };
}

export const script = (js) => ({
    type: 'script',
    content: js
});

const addAttribute = (element) => ([key, value]) => {
    if (parseInt(key, 10) == key) return;
    if (typeof value === 'function') {
        element._re ??= [];
        if (element._re.indexOf(key) < 0) {
            element.addEventListener(key, value);
            element._re.push(key);
        }
    } else if (typeof value === o && element.state) {
        element.state[key] = value;
    } else {
        element.setAttribute(key, typeof value === o ? jstr(value) : value);
    }
}

export const toElem = (node) => {
    if (node instanceof Element) return node;
    if (node instanceof HTMLElement) {
        return html[node.tagName](
            [...node.attributes].reduce((acc, val) => { acc[val.name] = val.value; return acc; }, {}), 
            ...[...node.childNodes].map(toElem));
    }
    return node.nodeType === 3 ? node.textContent : node;
}

class Element {
    element = null;
    state = {};
    add(option, ah = () => []) {
        if (!Array.isArray(option) && typeof option !== o) {
            this.element.appendChild(document.createTextNode(option));
        } else if (option?.raw) {
            this.element.innerHTML = str(option, ...ah());
        } else if (option instanceof HTMLElement) {
            this.element.appendChild(option);
        } else if (option instanceof Element) {
            this.element.appendChild(option.element);
        } else if (option && typeof option === o) {
            Object.entries(option).forEach(addAttribute(this.element));
        }
        return this;
    }
    constructor(name, ...rest) {
        this.element = document.createElement(name);
        if (!rest.length) return;
        this.state = rest[0];
        rest.forEach((item, i) => this.add(item, () => rest.slice(i + 1)));
    }
}

export const html = new Proxy({}, { get: (_, key) => (...args) => new Element(key, ...args) });

export function pfusch(tagName, initialState, template) {
    if (!template) {
        template = initialState;
        initialState = {};
    }
    initialState = { ...initialState };
    class Pfusch extends HTMLElement {
        fullRerender = true;
        is = { ...initialState };
        static formAssociated = true;
        #internals;

        constructor() {
            super();
            this.#internals = this.attachInternals();
            const internals = this.#internals;
            const stateProxy = (onChange) => {
                const subscribers = {};
                const proxy = new Proxy({ ...this.is }, {
                    set(target, key, value) {
                        if (target[key] !== value) {
                            target[key] = value;
                            if (key !== "subscribe") (onChange(), internals.setFormValue(jstr(target)));
                            (subscribers[key] || []).forEach(callback => callback(value));
                        }
                        return true;
                    },
                    get: (target, key) => target[key]
                });
                proxy.subscribe = (prop, callback) => {
                    (subscribers[prop] ??= []).push(callback);
                };
                return proxy;
            };
            this.attachShadow({ mode: 'open', serializable: true });
            this.state = stateProxy(() => this.render());
            if (!this.is.id || this.is.id === '') {
                this.is.id = `${tagName}-${Math.random().toString(36).substring(7)}`;
            }
            Object.keys(this.is).forEach(key => {
                const value = this.getAttribute(key) || this.getAttribute(key.toLowerCase());
                if (value !== null) {
                    this.is[key] = json(value);
                    this.state[key] = this.is[key];
                }
            });
            if (this.is.as !== 'slotted') this.shadowRoot.innerHTML = this.innerHTML;
            this.render();
        }

        static get observedAttributes() {
            const keys = Object.entries(initialState).filter(([_, value]) => typeof value !== o).map(([key]) => key);
            return ["id", ...keys.flatMap(key => [key, key.toLowerCase()])];
        }

        setElementId(element, id) {
            element.id = id;
            addAttribute(element)(['id', id]);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            const key = Object.keys(this.is).find(k => k === name || k.toLowerCase() === name);
            if (key) this.state[key] = json(newValue);
        }

        triggerEvent(eventName, detail) {
            this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
            window.postMessage({ eventName: `${tagName}.${eventName}`, detail: {
                sourceId: this.is.id,
                data: jstr(detail)
            } }, "*");
        }

        render() {
            const parts = template(this.state, this.triggerEvent.bind(this), [...this.childNodes]).filter(Boolean);
            const styles = [
                ...parts.filter(part => part.type === 'style'),
                css`${document.getElementById("pfusch-style")?.innerText || ''}`
            ];
            const elementParts = parts.filter(part => part instanceof Element);
            const scripts = parts.filter(part => part.type === 'script');
            this.shadowRoot.adoptedStyleSheets = styles.map(style => style.content());
            
            if (this.fullRerender) {
                this.fullRerender = false;
                scripts.forEach(script => script.content(this));
                if (location.search.includes('ssr=true')) {
                    const manualStyles = document.createElement("style");
                    manualStyles.innerText = styles.map(style => [...style.content().cssRules].map(rule => rule.cssText).join(' ')).join('');
                    this.shadowRoot.append(manualStyles);
                }
                [...document.querySelectorAll("link[data-pfusch]")].forEach(node => 
                    this.shadowRoot.append(node.cloneNode(true))
                );
            }

            if (this.is.as === 'lazy' && jstr(this.state) === jstr(this.is)) return;

            const processElement = (element, state) => {
                const tagName = element.tagName.toLowerCase();
                this.shadowRoot.querySelectorAll(tagName).forEach((e, index) => {
                    e.index = index;
                    this.setElementId(e, e.id || `${this.id}.${tagName}-${index}`);
                    Object.entries(state).forEach(addAttribute(e));
                    state.apply?.(e, index);
                });
            };

            elementParts.slice().reverse().forEach((part, i) => {
                const { element, state } = part;
                if (element.getAttribute('as') !== 'interactive') {
                    const child = this.shadowRoot.getElementById(element.id);
                    if (child) {
                        child.parentNode.replaceChild(element, child);
                        elementParts.splice(elementParts.length - 1 - i, 1);
                    } 
                    if (!element.id) {
                        this.setElementId(element, `${element.tagName.toLowerCase()}-${i}`);
                    }
                } else {
                    processElement(element, state);
                    elementParts.splice(elementParts.length - 1 - i, 1);
                }
            });

            const shadowRootChildren = Array.from(this.shadowRoot.children);
            elementParts.forEach((part) => {
                const element = part.element;
                const child = shadowRootChildren.find(child => child.id === element.id);
                if (!child) {
                    this.shadowRoot.appendChild(element);
                } else if (!child.isEqualNode(element)) {
                    this.shadowRoot.replaceChild(element, child);
                }
            });
        }
    }

    customElements.define(tagName, Pfusch);
    return Pfusch;
}