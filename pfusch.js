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
        // Special handling for form element properties
        if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
            element.value = value;
        } else if (key === 'checked' && element.tagName === 'INPUT' && element.type === 'checkbox') {
            element.checked = value === true || value === 'true';
        } else {
            element.setAttribute(key, typeof value === o ? jstr(value) : value);
        }
    }
}

export const toElem = (node) => {
    if (node instanceof Element) return node;
    if (node instanceof HTMLElement) {
        // Create a wrapper that contains the existing HTML element
        return {
            element: node,
            // Allow it to work with our system
            appendChild: (child) => node.appendChild(child instanceof Element ? child.element : child),
            textContent: node.textContent,
            innerHTML: node.innerHTML
        };
    }
    return node.nodeType === 3 ? node.textContent : node;
}

class Element {
    element = null;
    state = {};
    add(option, ah = () => []) {
        if (!Array.isArray(option) && typeof option !== o) {
            this.element.appendChild(document.createTextNode(option));
        } else if (Array.isArray(option)) {
            // Handle arrays of children
            option.forEach(child => this.add(child, ah));
        } else if (option?.raw) {
            this.element.innerHTML = str(option, ...ah());
        } else if (option instanceof HTMLElement) {
            this.element.appendChild(option);
        } else if (option instanceof Element) {
            this.element.appendChild(option.element);
        } else if (option?.element) {
            // Handle web component elements
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
        // Assign auto-ID if not set by template/attributes
        if (!this.element.id) {
            this.element.id = `${name.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
        }
    }
}

export const html = new Proxy({}, { 
    get: (_, key) => {
        const elementCreator = (...args) => {
            // Handle template literals (tagged template strings)
            if (args[0] && Array.isArray(args[0]) && args[0].raw) {
                const content = str(args[0], ...args.slice(1));
                return new Element(key, content);
            }
            
            // Handle custom web components (with hyphens) differently
            if (key.includes('-') || customElements.get(key)) {
                const element = document.createElement(key);
                if (args.length > 0 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
                    // First argument is attributes
                    Object.entries(args[0]).forEach(([attrKey, value]) => {
                        if (typeof value === 'function') {
                            element.addEventListener(attrKey, value);
                        } else {
                            element.setAttribute(attrKey, typeof value === 'object' ? jstr(value) : value);
                        }
                    });
                    
                    // Remaining arguments are children
                    args.slice(1).forEach(child => {
                        if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        } else if (child instanceof Element) {
                            element.appendChild(child.element);
                        } else if (child instanceof HTMLElement) {
                            element.appendChild(child);
                        }
                    });
                } else {
                    // All arguments are children
                    args.forEach(child => {
                        if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        } else if (child instanceof Element) {
                            element.appendChild(child.element);
                        } else if (child instanceof HTMLElement) {
                            element.appendChild(child);
                        }
                    });
                }
                
                return { element };
            }
            
            // Regular HTML elements
            return new Element(key, ...args);
        };
        
        // Support template literals by returning the function directly
        return elementCreator;
    } 
});

export function pfusch(tagName, initialState, template) {
    if (!template) {
        template = initialState;
        initialState = {};
    }
    initialState = { ...initialState };
    class Pfusch extends HTMLElement {
        static formAssociated = true;
        #internals;

        constructor() {
            super();
            this.#internals = this.attachInternals();
            const internals = this.#internals;
            this.scriptsExecuted = false;
            this.initialized = false;
            
            // Initialize state from attributes and initialState
            this.is = { ...initialState };
            for (const [key, value] of Object.entries(initialState)) {
                const attrValue = this.getAttribute(key) || this.getAttribute(key.toLowerCase());
                if (attrValue !== null) {
                    this.is[key] = json(attrValue);
                }
            }
            
            // Store light DOM children before creating shadow DOM
            this.lightDOMChildren = Array.from(this.children);
            
            const stateProxy = (onChange) => {
                const subscribers = {};
                const proxy = new Proxy({ ...this.is }, {
                    set(target, key, value) {
                        if (target[key] !== value) {
                            target[key] = value;
                            if (key !== "subscribe") {
                                onChange();
                                internals.setFormValue(jstr(target));
                            }
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
            
            // Check if this is a lazy component (SSR)
            if (this.getAttribute('as') === 'lazy' && this.shadowRoot.children.length > 0) {
                return; // Don't re-render if already rendered server-side
            }
            
            this.render();
        }

        static get observedAttributes() {
            const keys = Object.entries(initialState).filter(([_, value]) => typeof value !== o).map(([key]) => key);
            return ["id", "as", ...keys.flatMap(key => [key, key.toLowerCase()])];
        }

        setElementId(element, id) {
            element.id = id;
            addAttribute(element)(['id', id]);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            
            // Handle "as" attribute specially
            if (name === 'as') {
                if (newValue !== 'lazy' && oldValue === 'lazy') {
                    // Re-render if changing from lazy to non-lazy
                    this.render();
                }
                return;
            }
            
            const key = Object.keys(this.is).find(k => k === name || k.toLowerCase() === name);
            if (key && this.state) {
                this.state[key] = json(newValue);
            }
        }

        triggerEvent(eventName, detail) {
            const fullEventName = `${tagName}.${eventName}`;
            this.dispatchEvent(new CustomEvent(fullEventName, { detail, bubbles: true }));
            this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
            window.postMessage({ eventName: fullEventName, detail: {
                sourceId: this.is.id,
                data: jstr(detail)
            } }, "*");
        }

        render() {
            if (!template) return;
            
            const trigger = (eventName, detail) => this.triggerEvent(eventName, detail);
            
            // Create a special function to access light DOM children
            const children = (selector) => {
                if (!selector) return this.lightDOMChildren;
                return this.lightDOMChildren.filter(child => {
                    if (typeof selector === 'string') {
                        return child.tagName?.toLowerCase() === selector.toLowerCase() ||
                               child.matches?.(selector);
                    }
                    return false;
                });
            };
            
            // Create a function to get child content as pfusch elements
            const childElements = (selector) => {
                const matchedChildren = children(selector);
                return matchedChildren.map(child => toElem(child));
            };
            
            const result = template(this.state, trigger, { children, childElements });
            
            if (!Array.isArray(result)) return;
            
            // On first render, set up the basic structure
            if (!this.initialized) {
                this.initializeComponent(result, trigger);
                this.initialized = true;
                return;
            }
            
            // On subsequent renders, do a more intelligent update
            this.updateComponent(result);
        }
        
        initializeComponent(result, trigger) {
            // Add global pfusch styles
            const globalStyle = document.getElementById('pfusch-style');
            if (globalStyle) {
                const sheet = this.createStyleSheetFromElement(globalStyle);
                this.shadowRoot.adoptedStyleSheets = [sheet];
            }
            
            // Add stylesheets with data-pfusch attribute
            const pfuschStylesheets = document.querySelectorAll('link[data-pfusch]');
            pfuschStylesheets.forEach(link => {
                const linkClone = link.cloneNode(true);
                this.shadowRoot.appendChild(linkClone);
            });
            
            this.renderItems(result);
        }
        
        updateComponent(result) {
            // Store detailed focus information before re-rendering
            let focusInfo = null;
            
            // Check both shadow root and document for focused element
            const shadowFocused = this.shadowRoot.activeElement;
            const docFocused = document.activeElement;
            
            // The focused element might be the shadow host or an element inside
            let focusedElement = null;
            if (shadowFocused && shadowFocused !== this) {
                focusedElement = shadowFocused;
            } else if (docFocused === this && this.shadowRoot.activeElement) {
                focusedElement = this.shadowRoot.activeElement;
            }
            
            if (focusedElement) {
                const isFocusable = (
                    focusedElement.tagName === 'INPUT' ||
                    focusedElement.tagName === 'BUTTON' ||
                    focusedElement.tagName === 'SELECT' ||
                    focusedElement.tagName === 'TEXTAREA' ||
                    focusedElement.hasAttribute('tabindex') ||
                    focusedElement.contentEditable === 'true'
                );
                
                if (isFocusable) {
                    focusInfo = {
                        id: focusedElement.id,
                        tagName: focusedElement.tagName,
                        value: focusedElement.value,
                        selectionStart: focusedElement.selectionStart,
                        selectionEnd: focusedElement.selectionEnd,
                        // Store additional identifiers in case ID is missing
                        name: focusedElement.name,
                        className: focusedElement.className,
                        placeholder: focusedElement.placeholder,
                        textContent: focusedElement.textContent?.trim()
                    };
                    console.log('Storing focus info:', focusInfo);
                }
            }
            
            // Clear content but preserve styles/scripts
            const stylesheets = [...this.shadowRoot.adoptedStyleSheets];
            const linkElements = Array.from(this.shadowRoot.querySelectorAll('link[data-pfusch]'));
            
            this.shadowRoot.innerHTML = '';
            this.shadowRoot.adoptedStyleSheets = stylesheets;
            
            // Re-add link elements
            linkElements.forEach(link => this.shadowRoot.appendChild(link));
            
            // Render new content
            this.renderItems(result);
            
            // Restore focus after a microtask to ensure DOM is ready
            if (focusInfo) {
                requestAnimationFrame(() => {
                    this.restoreFocus(focusInfo);
                });
            }
        }
        
        restoreFocus(focusInfo) {
            let elementToFocus = null;
            
            // Try to find element by ID first
            if (focusInfo.id) {
                elementToFocus = this.shadowRoot.getElementById(focusInfo.id);
            }
            
            // If not found by ID, try other attributes
            if (!elementToFocus && focusInfo.name) {
                elementToFocus = this.shadowRoot.querySelector(`${focusInfo.tagName.toLowerCase()}[name="${focusInfo.name}"]`);
            }
            
            // If still not found, try by placeholder (for inputs)
            if (!elementToFocus && focusInfo.placeholder) {
                elementToFocus = this.shadowRoot.querySelector(`${focusInfo.tagName.toLowerCase()}[placeholder="${focusInfo.placeholder}"]`);
            }
            
            // If still not found, try by text content (for buttons)
            if (!elementToFocus && focusInfo.textContent) {
                const candidates = this.shadowRoot.querySelectorAll(focusInfo.tagName.toLowerCase());
                elementToFocus = Array.from(candidates).find(el => 
                    el.textContent?.trim() === focusInfo.textContent
                );
            }
            
            // If still not found, try by class
            if (!elementToFocus && focusInfo.className) {
                elementToFocus = this.shadowRoot.querySelector(`${focusInfo.tagName.toLowerCase()}.${focusInfo.className.split(' ')[0]}`);
            }
            
            if (elementToFocus) {
                console.log('Restoring focus to:', elementToFocus);
                elementToFocus.focus();
                
                // Only restore selection, not value (let state management handle value)
                if ((focusInfo.tagName === 'INPUT' || focusInfo.tagName === 'TEXTAREA') && 
                    typeof focusInfo.selectionStart === 'number' && 
                    elementToFocus.value === focusInfo.value) {
                    // Only restore selection if the value hasn't changed
                    elementToFocus.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
                }
            } else {
                console.log('Could not find element to restore focus to:', focusInfo);
            }
        }
        
        renderItems(items) {
            if (!Array.isArray(items)) {
                items = [items];
            }
            
            items.forEach(item => {
                if (!item) return;
                
                if (item.type === 'style') {
                    const sheet = item.content();
                    this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, sheet];
                } else if (item.type === 'script' && !this.scriptsExecuted) {
                    // Execute script only once during initialization
                    try {
                        // Create a context object with component reference
                        const scriptContext = {
                            component: this,
                            shadowRoot: this.shadowRoot,
                            state: this.state,
                            addEventListener: this.addEventListener.bind(this),
                            querySelector: (selector) => this.shadowRoot.querySelector(selector),
                            querySelectorAll: (selector) => this.shadowRoot.querySelectorAll(selector)
                        };
                        item.content.call(scriptContext);
                    } catch (error) {
                        console.error('Script execution error:', error);
                    }
                    this.scriptsExecuted = true;
                } else if (item instanceof Element) {
                    this.shadowRoot.appendChild(item.element);
                } else if (item?.element) {
                    this.shadowRoot.appendChild(item.element);
                } else if (Array.isArray(item)) {
                    this.renderItems(item);
                } else if (typeof item === 'string') {
                    this.shadowRoot.appendChild(document.createTextNode(item));
                }
            });
        }
        
        createStyleSheetFromElement(styleEl) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(styleEl.textContent || styleEl.innerHTML);
            return sheet;
        }
    }

    customElements.define(tagName, Pfusch);
    return Pfusch;
}