
const s = 'string';
const o = 'object';
function json(jsonString) {
    try {
        return (!(jsonString && typeof jsonString === s)) ? jsonString : JSON.parse(jsonString);
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
        element.setAttribute(key, typeof value === o ? JSON.stringify(value) : value);
    }
}

const setElementId = (element, id) => {
    element.id = id;
    addAttribute(element)(['id', id]);
}

class Element {
    element = null;
    state = {};
    constructor(name, ...rest) {
        this.element = document.createElement(name);
        if (!rest) return;
        this.state = rest[0];
        for (let i = 0; i < rest.length; i++) {
            let option = rest[i];
            if (!Array.isArray(option) && typeof option !== o) {
                this.element.innerHTML = option;
            }
            else if (option && Array.isArray(option) && option.raw) {
                this.element.innerHTML = str(option, ...rest.slice(i + 1));
                break;
            }
            else if (option && option instanceof Element) {
                this.element.appendChild(option.element);
            }
            else if (option && typeof option === o) {
                Object.entries(option).forEach(addAttribute(this.element));
            }
        }
    }
}

export const html = new Proxy({}, { get: (_, key) => (...args) => new Element(key, ...args) });

export function pfusch(tagName, initialState, template) {
    if (!template) {
        template = initialState;
        initialState = {};
    }
    initialState = { id: '', ...initialState };
    class Pfusch extends HTMLElement {
        fullRerender = true;
        elements = [];

        constructor() {
            super();

            const stateProxy = (onChange) => new Proxy({ ...initialState }, {
                set: function (target, key, value) {
                    if (target[key] !== value) {
                        target[key] = value;
                        onChange();
                    }
                    return true;
                },
                get: (target, key) => target[key]
            });
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = this.innerHTML;
            this.state = stateProxy(() => this.render());
            Object.keys(initialState).forEach(key => {
                if (this.hasAttribute(key)) {
                    this.state[key] = json(this.getAttribute(key));
                }
            });
            this.render();
        }

        static get observedAttributes() {
            return ["id", ...Object.entries(initialState).filter(([_, value]) => typeof value !== o).map(([key]) => key)];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            this.state[name] = json(newValue);
        }

        triggerEvent(eventName, detail) {
            this.dispatchEvent(new CustomEvent(eventName, { detail }));
        }

        render() {
            const parts = template(this.state, this.triggerEvent.bind(this)).filter(Boolean);
            const styles = [
                ...parts.filter(part => part.type === 'style'),
                css`${window.document.getElementById("pfusch-style")?.innerText || ''}`
            ];
            const elementParts = parts.filter(part => part instanceof Element);
            const scripts = parts.filter(part => part.type === 'script');

            const processElement = (element, state) => {
                const tagName = element.tagName.toLowerCase();
                const elements = this.shadowRoot.querySelectorAll(tagName);
                elements.forEach((e, index) => {
                    e.index = index;
                    setElementId(e, e.id || `${tagName}-${index}`);
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
                } else {
                    processElement(element, state);
                    elementParts.splice(elementParts.length - 1 - i, 1);
                }
            });

            const shadowRootChildren = Array.from(this.shadowRoot.children);
            elementParts.forEach((part, index) => {
                const element = part.element;
                setElementId(element, element.id || `${element.tagName.toLowerCase()}-${index}`);
                const child = shadowRootChildren.find(child => child.id === element.id);
                if (!child) {
                    this.shadowRoot.appendChild(element);
                } else if (!child.isEqualNode(element)) {
                    this.shadowRoot.replaceChild(element, child);
                }
            });

            this.shadowRoot.adoptedStyleSheets = styles.map(style => style.content());
            if (this.fullRerender) {
                this.fullRerender = false;
                scripts.forEach(script => script.content(this));
            }
        }
    }

    customElements.define(tagName, Pfusch);
    return Pfusch;
}
