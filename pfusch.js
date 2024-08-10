
let objIdMap = new WeakMap, objectCount = 0;
function objectId(object) {
    if (!objIdMap.has(object)) objIdMap.set(object, ++objectCount);
    return objIdMap.get(object);
}
function asJson(jsonString) {
    if (!(jsonString && typeof jsonString === "string")) {
        return jsonString;
    }

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return jsonString;
    }
}

function toString(string, ...tags) {
    return (typeof string === 'string') ? string : string.reduce((acc, part, i) => {
        return acc + part + (tags[i] || '');
    }, '');
}

export function css(style, ...tags) {
    return {
        type: 'style',
        content: () => {
            var adoptedStyleSheets = new CSSStyleSheet();
            adoptedStyleSheets.replaceSync(toString(style, ...tags));
            return adoptedStyleSheets;
        }
    };
}

export function script(js) {
    return {
        type: 'script',
        content: (element) => {
            return js(element);
        }
    };
}


class Element {
    element = null;
    constructor(name, ...rest) {
        this.element = document.createElement(name);
        if (!rest) return;
        for (let i = 0; i < rest.length; i++) {
            let option = rest[i];
            if (typeof option === 'string') {
                this.element.innerHTML = option;
            }
            else if (option && Array.isArray(option) && option.raw) {
                this.element.innerHTML = toString(option, ...rest.slice(i + 1));
                break;
            }
            else if (option && option instanceof Element) {
                this.element.appendChild(option.get());
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
            this.element.id = `${name}-${objectId(this.element)}`;
        }
    }

    get() {
        return this.element;
    }
}

export const html = new Proxy({}, { get: (_, key) => (...args) => new Element(key, ...args) });

export function pfusch(tagName, initialState, template) {
    if (!template) {
        template = initialState;
        initialState = {};
    }
    class CustomComponent extends HTMLElement {
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
                    var attr = this.getAttribute(key);
                    this.state[key] = asJson(attr);
                }
            });
            this.render();
        }

        static get observedAttributes() {
            return Object.keys(initialState);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            this.state[name] = asJson(newValue);
        }

        triggerEvent(eventName, detail) {
            this.dispatchEvent(new CustomEvent(eventName, { detail }));
        }

        render() {
            const parts = template(this.state, this.triggerEvent.bind(this));
            const styles = parts.filter(part => part.type === 'style');
            const elementParts = [...parts.filter(part => part instanceof Element)];
            const scripts = parts.filter(part => part.type === 'script');
            // iterate through all elements on the shadow root, and compare them with the new parts
            //  if they are false on Element.isEqualNode, replace them, otherwise keep them
            const shadowRootChildren = Array.from(this.shadowRoot.children);
            elementParts.forEach(part => {
                const element = part.get()
                const child = shadowRootChildren.find(child => child.id === element.id);
                if (!child) {
                    this.shadowRoot.appendChild(element);
                } else if (!child.isEqualNode(element)) {
                    this.shadowRoot.replaceChild(element, child);
                }
            });

            // remove any elements that are not in the new parts
            shadowRootChildren.forEach(child => {
                if (!elementParts.find(part => part.get().id === child.id)) {
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

    customElements.define(tagName, CustomComponent);
    return CustomComponent;
}
