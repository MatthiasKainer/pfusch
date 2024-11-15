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
        element.setAttribute(key, typeof value === o ? jstr(value) : value);
    }
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
                    set: function (target, key, value) {
                        if (target[key] !== value) {
                            target[key] = value;
                            if (key != "subscribe") (onChange(), internals.setFormValue(jstr(target)));
                            (subscribers[key] || []).forEach(callback => callback(value));
                        }
                        return true;
                    },
                    get: (target, key) => target[key]
                })
                proxy.subscribe = function(prop, callback) {
                    subscribers[prop] = subscribers[prop] || [];
                    subscribers[prop].push(callback);
                };
                return proxy;
            };
            this.attachShadow({ mode: 'open', serializable: true });
            this.shadowRoot.innerHTML = this.innerHTML;
            this.state = stateProxy(() => this.render());
            Object.keys(this.is).forEach(key => {
                if (this.hasAttribute(key)) {
                    this.is[key] = json(this.getAttribute(key));
                    this.state[key] = this.is[key];
                }
            });
            this.render();
        }

        static get observedAttributes() {
            return ["id", ...Object.entries(initialState).filter(([_, value]) => typeof value !== o).map(([key]) => key)];
        }

        setElementId(element, id) {
            element.id = id;
            addAttribute(element)(['id', id]);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            this.state[name] = json(newValue);
        }

        triggerEvent(eventName, detail) {
            this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
            window.postMessage({ eventName: `${tagName}.${eventName}`, detail: {
                sourceId: this.is.id,
                data: detail
            } }, "*");
        }

        render() {
            const parts = template(this.state, this.triggerEvent.bind(this)).filter(Boolean);
            const styles = [
                ...parts.filter(part => part.type === 'style'),
                css`${window.document.getElementById("pfusch-style")?.innerText || ''}`
            ];
            const elementParts = parts.filter(part => part instanceof Element);
            const scripts = parts.filter(part => part.type === 'script');
            this.shadowRoot.adoptedStyleSheets = styles.map(style => style.content());
            if (this.fullRerender) {
                this.fullRerender = false;
                scripts.forEach(script => script.content(this));
                // if we have a queryString for ssr=true, we are in prerender mode
                if (window.location.search.includes('ssr=true')) {
                    const manualStyles = document.createElement("style");
                    manualStyles.innerText = styles.map(style => [...style.content().cssRules].map(rule => rule.cssText).join(' ')).join('');
                    this.shadowRoot.append(manualStyles);
                }
                [...document.querySelectorAll("link[data-pfusch]")].map(node => this.shadowRoot.append(node.cloneNode(true)));
            }

            // if state is initial state, and attibute `as` is set to `lazy`, early exit
            if (this.is["as"] === 'lazy' && jstr(this.state) === jstr(this.is)) {
                return;
            }

            const processElement = (element, state) => {
                const tagName = element.tagName.toLowerCase();
                const elements = this.shadowRoot.querySelectorAll(tagName);
                elements.forEach((e, index) => {
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
                    } else if (!element.id) {
                        this.setElementId(element, `${this.id}.${element.tagName.toLowerCase()}-${i}`);
                    }
                } else {
                    processElement(element, state);
                    elementParts.splice(elementParts.length - 1 - i, 1);
                }
            });

            const shadowRootChildren = Array.from(this.shadowRoot.children);
            elementParts.forEach((part, index) => {
                const element = part.element;
                this.setElementId(element, element.id || `${element.tagName.toLowerCase()}-${index}`);
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