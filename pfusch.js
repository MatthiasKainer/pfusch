
let omap = new WeakMap, ocount = 0;
function oid(o) {
    if (!omap.has(o)) omap.set(o, ++ocount);
    return omap.get(o);
}

const s = "string";
function json(jsonString) {
    try {
        return (!(jsonString && typeof jsonString === "string")) ? jsonString : JSON.parse(jsonString);
    } catch (error) {
        return jsonString;
    }
}

const str = (string, ...tags) =>
    (typeof string === s) ? string : string.reduce((acc, part, i) => {
        return acc + part + (tags[i] || '');
    }, '');

export function css(style, ...tags) {
    return {
        type: 'style',
        content: () => {
            var adoptedStyleSheets = new CSSStyleSheet();
            adoptedStyleSheets.replaceSync(str(style, ...tags));
            return adoptedStyleSheets;
        }
    };
}

export const script = (js) => ({
    type: 'script',
    content: js
});

class Element {
    element = null;
    constructor(name, ...rest) {
        this.element = document.createElement(name);
        if (!rest) return;
        for (let i = 0; i < rest.length; i++) {
            let option = rest[i];
            if (typeof option === s) {
                this.element.innerHTML = option;
            }
            else if (option && Array.isArray(option) && option.raw) {
                this.element.innerHTML = str(option, ...rest.slice(i + 1));
                break;
            }
            else if (option && option instanceof Element) {
                this.element.appendChild(option.element);
            }
            else if (option && typeof option === 'object') {
                Object.entries(option).forEach(([key, value]) => {
                    try {
                        if (typeof value === 'function') {
                            this.element.addEventListener(key, value);
                        } else {
                            this.element.setAttribute(key, typeof value === 'object' ? JSON.stringify(value) : value);
                        }
                    } catch (e) {
                        console.error(`Cannot add ${key} to ${name}`, e);
                    }
                });
            }
        }
        if (this.element.id === '') {
            this.element.id = `${name}-${oid(this.element)}`;
        }
    }
}

export const html = new Proxy({}, { get: (_, key) => (...args) => new Element(key, ...args) });

export function pfusch(tagName, initialState, template) {
    if (!template) {
        template = initialState;
        initialState = {};
    }
    class Pfusch extends HTMLElement {
        fullRerender = true;
        elements = [];
        constructor() {
            super();

            const stateProxy = (onChange) => new Proxy({ ...initialState }, {
                set: function (target, key, value) {
                    target[key] = value;
                    onChange();
                    return true;
                }
            });
            this.attachShadow({ mode: 'open' });
            this.state = stateProxy(() => this.render());
            Object.keys(initialState).forEach(key => {
                if (this.hasAttribute(key)) {
                    this.state[key] = json(this.getAttribute(key));
                }
            });
            this.render();
        }

        static get observedAttributes() {
            return Object.keys(initialState);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            this.state[name] = json(newValue);
        }

        triggerEvent(eventName, detail) {
            this.dispatchEvent(new CustomEvent(eventName, { detail }));
        }

        render() {
            const parts = template(this.state, this.triggerEvent.bind(this));
            const styles = parts.filter(part => part.type === 'style');
            const elementParts = [...parts.filter(part => part instanceof Element)];
            const scripts = parts.filter(part => part.type === 'script');

            const shadowRootChildren = Array.from(this.shadowRoot.children);
            elementParts.forEach(part => {
                const element = part.element;
                const child = shadowRootChildren.find(child => child.id === element.id);
                if (!child) {
                    this.shadowRoot.appendChild(element);
                } else if (!child.isEqualNode(element)) {
                    this.shadowRoot.replaceChild(element, child);
                }
            });
            shadowRootChildren.forEach(child => {
                if (!elementParts.find(part => part.element.id === child.id)) {
                    this.shadowRoot.removeChild(child);
                }
            });

            this.shadowRoot.adoptedStyleSheets = styles.map(style => style.content());
            if (this.fullRerender) {
                this.fullRerender = false;
                scripts.forEach(script => script.content(this.shadowRoot));
            }
        }
    }

    customElements.define(tagName, Pfusch);
    return Pfusch;
}
