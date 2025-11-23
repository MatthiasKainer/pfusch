# pfusch

![lines of code](https://img.shields.io/badge/loc-347-green?label=lines%20of%20code) ![raw size](https://img.shields.io/badge/size-8.0K-green?label=size) ![gzipped](https://img.shields.io/badge/gzipped-3.0K-green?label=gzipped%20size)

> pfusch [pfʊʃ]: Austrian slang word refering to work that is done carelessly, unprofessionally, or without proper skill, resulting in poor quality or subpar results.

**Pfusch is a super-minimal web component library for rapid prototyping and progressive enhancement.** No npm. No bundler. No build step. No fighting with tooling. Just HTML, JavaScript, and results in minutes.

## Why Pfusch?

- **Instant Setup**: Drop a script tag in your HTML and start building
- **Progressive Enhancement**: Write semantic HTML first, enhance with interactivity where needed
- **Design System Integration**: Works out-of-the-box with your existing CSS and design tokens
- **Prototype to Production**: Go from idea to interactive prototype faster than you can say "npm install"
- **Zero Dependencies**: No package.json, no node_modules, no build pipeline

Pfusch is perfect for quick prototypes, internal tools, interactive documentation, and projects where you want to enhance static HTML without downloading the internet.

## Quick Start

**1. Add pfusch to your HTML**

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="your-design-system.css" data-pfusch>
</head>
<body>
  <h1>My Prototype</h1>
  
  <!-- Your interactive component will go here -->
  <live-counter></live-counter>
  
  <script type="module">
    import { pfusch, html } from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";
    
    pfusch("live-counter", { count: 0 }, (state) => [
      html.div(
        html.p`Count: ${state.count}`,
        html.button({ click: () => state.count++ }, "Increment")
      )
    ]);
  </script>
</body>
</html>
```

That's it. No npm install, no build step, no webpack config. Just open the HTML file and you're done.

## Core Concepts

### Progressive Enhancement

Start with semantic HTML, enhance with interactivity:

```html
<!-- Your static content -->
<data-table>
  <table>
    <thead><tr><th>Name</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Item 1</td><td>Ready</td></tr>
      <tr><td>Item 2</td><td>Pending</td></tr>
    </tbody>
  </table>
</data-table>

<script type="module">
  import { pfusch, html, script } from "./pfusch.js";
  
  pfusch("data-table", { sortBy: null, items: [], loading: true }, (state, trigger, { children }) => {
    const sortItems = (items, sortBy) => {
      if (!sortBy) return items;
      return [...items].sort((a, b) => 
        String(a[sortBy]).localeCompare(String(b[sortBy]))
      );
    };
    
    return [
      script(function() {
        // Extract data from original table in light DOM
        const tables = children('table');
        if (tables && tables.length > 0) {
          const table = tables[0];
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          state.items = rows.map(row => {
            const cells = row.querySelectorAll('td');
            return {
              name: cells[0]?.textContent?.trim() || '',
              status: cells[1]?.textContent?.trim() || ''
            };
          });
        }
        state.loading = false;
      }),
      // Add interactive controls
      html.div(
        html.button({ click: () => state.sortBy = 'name' }, "Sort by Name"),
        html.button({ click: () => state.sortBy = 'status' }, "Sort by Status"),
        html.button({ click: () => state.sortBy = null }, "Clear")
      ),
      // Show original content while loading, then show sorted data
      state.loading 
        ? html.slot()
        : html.table(
            html.thead(html.tr(html.th("Name"), html.th("Status"))),
            html.tbody(
              ...sortItems(state.items, state.sortBy).map(item =>
                html.tr(html.td(item.name), html.td(item.status))
              )
            )
          )
    ];
  });
</script>
```

### Event-Driven Architecture

Build loosely-coupled components with global events:

```html
<status-display event="data-loader.loaded"></status-display>
<data-loader></data-loader>

<script type="module">
  import { pfusch, html, script } from "./pfusch.js";
  
  // Display listens for events
  pfusch("status-display", { message: "", event: "" }, (state) => [
    script(function() {
      window.addEventListener(state.event, (e) => {
        state.message = e.detail.status;
      });
    }),
    html.div({ class: "status-message" }, state.message)
  ]);
  
  // Loader triggers events
  // NOTE: trigger("loaded") automatically becomes "data-loader.loaded"
  // Events are prefixed with the component name
  pfusch("data-loader", {}, (state, trigger) => [
    html.button({ 
      click: async () => {
        const data = await fetch('/api/data').then(r => r.json());
        trigger("loaded", { status: "Success!", data });
      }
    }, "Load Data")
  ]);
</script>
```

### Design System Integration

Pfusch works seamlessly with your existing styles:

```html
<head>
  <!-- Your design system -->
  <link rel="stylesheet" href="design-system.css" data-pfusch>
  <style id="pfusch-style">
    /* Additional component-specific styles */
    .status-badge { /* ... */ }
  </style>
</head>

<body>
  <status-panel status="loading"></status-panel>
  
  <script type="module">
    import { pfusch, html, css } from "./pfusch.js";
    
    pfusch("status-panel", { status: "idle" }, (state) => [
      // Use your design system's classes
      html.div({ class: "card" },
        html.span({ 
          class: `badge status-badge status-${state.status}` 
        }, state.status),
        html.p({ class: "text-muted" }, "System Status")
      )
    ]);
  </script>
</body>
```

### Zero Dependencies, even for Testing

Pfusch components can be tested with just Node.js:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, pfuschTest } from './unit-tests/pfusch-stubs.js';
import { pfusch, html } from '../pfusch.js';
const { restore } = setupDomStubs();
pfusch('my-widget', {}, () => [html.div('hi')]);
test('my-widget renders correctly', async () => {
  const widget = pfuschTest('my-widget');
  await widget.flush();
  assert.equal(widget.get('div').textContent, 'hi');
});
restore();
```

Read more in the [unit tests README](unit-tests/README.md).

### Real-World Example: Live Monitoring Dashboard

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="your-design.css" data-pfusch>
</head>
<body>
  <h1>System Monitor</h1>
  
  <!-- Static content enhanced with live updates -->
  <div class="dashboard">
    <metric-card metric="cpu" label="CPU Usage"></metric-card>
    <metric-card metric="memory" label="Memory"></metric-card>
    <event-log max="50"></event-log>
  </div>
  
  <script type="module">
    import { pfusch, html, css, script } from "./pfusch.js";
    
    // Reusable metric display
    pfusch("metric-card", { metric: "", label: "", value: "–" }, (state) => [
      script(function() {
        // Subscribe to global metric updates
        window.addEventListener(`metrics.${state.metric}`, (e) => {
          state.value = e.detail.value;
        });
      }),
      html.div({ class: "card" },
        html.h3(state.label),
        html.div({ class: "metric-value" }, state.value)
      )
    ]);
    
    // Event log that auto-updates
    pfusch("event-log", { events: [], max: 100 }, (state) => [
      script(function() {
        window.addEventListener("system.event", (e) => {
          state.events = [
            { time: Date.now(), msg: e.detail.message },
            ...state.events
          ].slice(0, state.max);
        });
      }),
      html.div({ class: "card" },
        html.h3("Events"),
        html.ul(
          ...state.events.map(evt => 
            html.li(
              html.time(new Date(evt.time).toLocaleTimeString()),
              html.span(evt.msg)
            )
          )
        )
      )
    ]);
    
    // Simulate metrics (replace with real WebSocket/SSE in production)
    setInterval(() => {
      window.dispatchEvent(new CustomEvent("metrics.cpu", {
        detail: { value: Math.floor(Math.random() * 100) + "%" }
      }));
      window.dispatchEvent(new CustomEvent("system.event", {
        detail: { message: "Health check passed" }
      }));
    }, 2000);
  </script>
</body>
</html>
```

See more examples at https://matthiaskainer.github.io/pfusch/

## Rapid Prototyping Patterns

### Pattern 1: Static HTML First

Always start with working HTML, then enhance:

```html
<!-- Works without JavaScript -->
<form action="/api/subscribe" method="post">
  <input type="email" name="email" required>
  <button type="submit">Subscribe</button>
</form>

<script type="module">
  import { pfusch, script } from "./pfusch.js";
  
  // Enhance with client-side validation and feedback
  pfusch("email-form", { status: "" }, (state, trigger, { children }) => [
    script(function() {
      const form = this.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        state.status = "Submitting...";
        const data = new FormData(form);
        await fetch(form.action, { method: 'POST', body: data });
        state.status = "✓ Subscribed!";
      });
    }),
    children()[0], // Original form
    state.status ? html.p({ class: "status" }, state.status) : null
  ]);
</script>
```

### Pattern 2: Global Event Bus

Decouple components with window events:

```html
<search-box></search-box>
<results-list></results-list>
<results-count></results-count>

<script type="module">
  import { pfusch, html, script } from "./pfusch.js";
  
  pfusch("search-box", { query: "" }, (state, trigger) => [
      html.form({
        submit: async (e) => {
          e.preventDefault();
          const data = new FormData(e.target);
          state.query = data.get("query") || "";
          trigger("search", { query: state.query });
        }
      },
        html.input({
          name: "query",
          type: "search",
          value: state.query,
          placeholder: "Search..."
        }),
        html.button({ type: "submit" }, "Search")
      )
    ]);
  
  pfusch("results-list", { items: [] }, (state, trigger) => [
      script(function() {
        window.addEventListener("search-box.search", async (e) => {
          const res = await fetch(`/api/search?q=${encodeURIComponent(e.detail.query)}`);
          state.items = await res.json();
          trigger("updated", state.items);
        });
      }),
      html.ul(...state.items.map(item => html.li(item.name)))
    ]);
  
  pfusch("results-count", { count: 0 }, (state) => [
      script(function() {
        window.addEventListener("results-list.updated", (e) => {
          state.count = Array.isArray(e.detail) ? e.detail.length : 0;
        });
      }),
      html.div(`Found ${state.count} results`)
    ]);
</script>
```

### Pattern 3: Design System Integration

Use your existing CSS framework:

```html
<link rel="stylesheet" href="bootstrap.min.css" data-pfusch>

<script type="module">
  import { pfusch, html } from "./pfusch.js";
  
  pfusch("alert-box", { type: "info", message: "" }, (state) => [
    html.div({ 
      class: `alert alert-${state.type}`,
      role: "alert" 
    }, state.message)
  ]);
  
  pfusch("loading-button", { loading: false }, (state, trigger) => [
    html.button({
      class: "btn btn-primary",
      disabled: state.loading,
      click: async () => {
        state.loading = true;
        await someAsyncAction();
        state.loading = false;
      }
    }, state.loading ? html.span({ class: "spinner-border spinner-border-sm" }) : "Submit")
  ]);
</script>
```

### Pattern 4: Server-Sent Events (SSE)

Perfect for real-time dashboards:

```html
<live-feed url="/api/events"></live-feed>

<script type="module">
  import { pfusch, html, script } from "./pfusch.js";
  
  pfusch("live-feed", { url: "", events: [] }, (state) => [
    script(function() {
      const evtSource = new EventSource(state.url);
      evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        state.events = [data, ...state.events].slice(0, 50);
      };
      this.component.addEventListener('disconnected', () => {
        evtSource.close();
      });
    }),
    html.ul({ class: "event-list" },
      ...state.events.map(evt => 
        html.li(
          html.time(new Date(evt.timestamp).toLocaleString()),
          html.span(evt.message)
        )
      )
    )
  ]);
</script>
```

### Pattern 5: Form Integration

Native form support with state serialization:

```html
<form method="post" action="/api/save">
  <star-rating name="rating" value="0"></star-rating>
  <button type="submit">Submit</button>
</form>

<script type="module">
  import { pfusch, html } from "./pfusch.js";
  
  pfusch("star-rating", { name: "rating", value: 0, max: 5 }, (state) => [
    // State is automatically serialized to form value
    html.div(
      ...Array.from({ length: state.max }, (_, i) => 
        html.button({
          type: "button",
          click: () => state.value = i + 1
        }, state.value > i ? "★" : "☆")
      )
    )
  ]);
</script>
```

## Build

No need. I minify it and get he sizes fo the badges are gather via

```shell
rm -f pfusch.min.js;
npx terser pfusch.js --module --compress --mangle > pfusch.min.js
ls -lh pfusch.min.js | awk '{print $5}';
gzip -k -9 pfusch.min.js; ls -lh pfusch.min.js.gz | awk '{print $5}'; rm -f pfusch.min.js.gz
```

## I have questions...

### Can I use this in production?

Pfusch was built for rapid prototyping and internal tools where you need results in minutes, not hours. It's perfect for:

- **Internal dashboards and admin panels**
- **Interactive prototypes and demos**
- **Documentation with live examples**
- **Quick MVPs and proof-of-concepts**
- **Progressive enhancement of static sites**

If you want to avoid npm installing the internet and fighting with webpack configs just to add some interactivity to your page, pfusch is a great choice.

That said, the framework was built quickly (in a rage, even), and most effort went into the GitHub page rather than production-grade testing. The license is MIT, so you're free to use it however you want—just know what you're getting into.

### How does it compare to React/Vue/Svelte?

**Pfusch is not trying to be React.** It's the opposite philosophy:

- ❌ No build step, no npm, no toolchain
- ✅ Works directly in the browser
- ✅ Progressive enhancement first
- ✅ Integrates with your existing HTML/CSS
- ✅ Event-driven, loosely-coupled architecture
- ✅ Perfect for prototypes and internal tools

If you're building a complex SPA with routing, state management, and thousands of components, use a proper framework. If you want to add interactivity to a page in 5 minutes without fighting with tooling, use pfusch.

### How to use it?

Kinda like above in the readme. There are more examples in the [example](example/) folder. You'll figure it out...

### Come on, some hints!

**Basic API:**

```js
pfusch(
  "component-name",           // Custom element tag name
  { key: "value" },           // Initial state (becomes attributes)
  (state, trigger, helpers) => [  // Template function
    // Returns array of: html elements, css styles, or scripts
  ]
)
```

**Key Features:**

1. **State becomes attributes:** `{ count: 0 }` → `<my-counter count="5">`
2. **Reactive updates:** Change `state.count++` → DOM updates automatically
3. **Event triggering:** `trigger("clicked", data)` → fires `my-counter.clicked` globally
4. **Light DOM access:** `helpers.children()` → access original HTML content
5. **State subscription:** `state.subscribe('key', callback)` → react to changes

**Quick Examples:**

```js
// Simple component
pfusch("hello-world", { who: "world" }, (state) => [
  html.div(html.h2`Hello ${state.who}!`)
]);

// With events
pfusch("click-counter", { count: 0 }, (state, trigger) => [
  html.form({
    submit: (e) => {
      e.preventDefault();
      state.count++;
      trigger("counted", state.count);
    }
  },
    html.button({ type: "submit" }, `Clicked ${state.count} times`)
  )
]);

// With async data
pfusch("data-loader", { data: [] }, (state) => [
  script(async function() {
    state.data = await fetch('/api/data').then(r => r.json());
  }),
  html.ul(...state.data.map(item => html.li(item.name)))
]);

// Progressive enhancement
pfusch("enhanced-form", {}, (state, trigger, { children }) => [
  script(function() {
    const form = this.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle client-side
    });
  }),
  children()[0]  // Keep original form HTML
]);
```

See the [Rapid Prototyping Patterns](#rapid-prototyping-patterns) section for more examples!

### Now I'm really into the classics, like html forms and full browser support and all that stuff. Can you help me there?

Obviously. Let's say you have a nice star-rating component like this:

```js
pfusch("star-rating", { id: "rating", count: 5, value: 0, name: "rating" }, (state) => [
    css`
    :host {
        display: flex;
        flex-direction: row-reverse;
        justify-content: center;
        padding: 10px;
        width: 100%;
        height: 50px;
    }
    input {
        display: none;
    }
    label {
        font-size: 50px;
        color: #ccc;
        cursor: pointer;
        transition: color 0.5s;
    }
    input:checked ~ label, label:hover, label:hover ~ label {
        color: #f5b301;
    }
    `,
    ...Array.from({ length: state.count }, (_, i) => {
        const value = state.count - i;
        return [
            html.input({
                type: "radio",
                id: `${state.id}-star-${value}`,
                name: state.name,
                value,
                change: (e) => state.value = e.target.value,
                ...state.value == value && { checked: true }
            }),
            html.label({ for: `${state.id}-star-${value}` }, "★")
        ];
    }).flat()
])

```

When you open this to your page like so:

```html
    <form method="post" action="/">
        <star-rating id="rating" name="rating"></star-rating>
        <label for="comment">Comment</label>
        <textarea name="comment" id="comment" cols="30" rows="10" placeholder="Say what you think, but in friendly" aria-label="Comment"></textarea>
        <button type="submit">Submit</button>
    </form>
```

You will get a page like this:

![5-star](data:image/png;base64,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)

Submitting the form will return:

```js
{
  rating: '{"id":"rating","count":5,"value":"4","name":"rating"}',
  comment: 'Something friendly'
}
```

Thus, you will have access to the element and it's entire state at the point of submit. 

### Wait, how did you do the SSR thing? My CTO says I can't use a framework without SSR!

do something like this:

```js
// tested with puppeteer@23.1.0
import puppeteer from 'puppeteer';
const args = puppeteer.defaultArgs();
args.push('--enable-experimental-web-platform-features');

async function ssr(url) {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto(url, {waitUntil: 'networkidle0'});
  const html = await page.$eval('html', (element) => {
    return element.getHTML({includeShadowRoots: true, serializableShadowRoots: true});
  });
  await browser.close();
  return html;
}

console.log(await ssr('https://matthiaskainer.github.io/pfusch/));
```

hydration then comes for free.

### Styles are an issue! Whatever I define in the page is not applied to the component!

That's because of the shadow dom. If you want to style the component from the outside, you can either use the `css` function, which will add a style to the component. If you want to just define some base classes that you can use in the component, you can use a `<style>` element with the id `pfusch-style`:

```html
<style id="pfusch-style">
  * {
    color: red;
  }
</style>
```

Every component will have this style applied, so you can define some base styles for your components. If you must do this for stylesheet links, then add the data-pfusch attribute to the link tag:

```html
<link rel="stylesheet" href="styles.css" data-pfusch>
```

This will add the stylesheet to the shadow dom of the component, so you can pass classes to the inside.

### Okay, but I want to do something when state changes

Ah, you really want all the fun of React, but without the React. You can do that by adding a `subscribe` function to the state object. This function will be called every time the state for a key changes, and you can do whatever you want with it. For instance, you can add a `subscribe` function to the component that loads a list:

```js
pfusch("item-list", { source: "", items: [] }, (state) => [
    script(async () => {
        state.subscribe("source", async () => {
            if (state.source === "") return ``;
            state.items = await fetch(`/data/${state.source}.json`).then(r => r.json())
        })
    }),
    html.ul(...state.items.map(item => html.li(item.name)))
])
```

Now if someone use the component like this:

```html
<item-list source="items"></item-list>
```

and then changes the source attribute, the list will be updated with the new items. This is all thanks to the javascript `Proxy` object, which is also the reason why this library is very slow and not supported in IE11.


### But I need routing and...

STOP RIGHT THERE! Pfusch is not an SPA framework. It's for progressive enhancement and rapid prototyping. 

**For routing:** Use the browser's native navigation. Server-side routing works great and is faster than client-side routing anyway.

**For complex state management:** If you need Redux-level state management, you probably need a real framework, not pfusch.

**For large applications:** Pfusch shines at small-to-medium interactive enhancements, not building the next Facebook.

The web has excellent built-in features for navigation, forms, and accessibility. Pfusch helps you enhance them, not replace them. Embrace the platform! 🎉

But really, this libary is thought to embrace what you get for free, namely html, standard css, and server side routing/rendering, and focused on progressive enhancement. If you want to build a SPA, you can do that, but you have to do it with the tools you have, not the tools you want.

### And whats with all that `html.*` things?

This gives you access to all html elements (and the elements you created). For html elements, do `html.name`, for web components do `html["name"]`. Any attributes & events can be passed as first argument, the inner content as second (as string or another `html.*`). If you don't have any attributes, just add the inner content.


### None of my react tricks work here! This is bollocks!

Coming from React, ey? Here are the key differences and gotchas you need to know:

#### State Management is done not the React way

**React way:**
```jsx
const [count, setCount] = useState(0);
setCount(count + 1); // Creates new state
```

**pfusch way:**
```javascript
pfusch("my-counter", { count: 0 }, (state) => [
  html.button({ 
    click: () => state.count++ // Direct mutation!
  }, `Count: ${state.count}`)
]);
```

**Key difference:** pfusch uses direct state mutation via Proxy objects, not immutable updates. This feels more like Vue or vanilla JS.

#### Re-rendering Philosophy

**React:** Re-renders the entire component tree and uses virtual DOM diffing.

**pfusch:** Only updates the specific DOM elements that changed. No virtual DOM, direct DOM manipulation.

```javascript
// This example shows how pfusch handles complex state
pfusch("my-dialog", {
  item: "",
  result: null
}, (state, trigger) => [
    html.form({
      submit: (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        state.item = data.get("item") || "";
        state.result = "Starting the thing!";
        trigger("generate", { item: state.item });
      }
    },
      html.input({
        name: "item",
        value: state.item,
        placeholder: "Type and submit"
      }),
      html.button({ type: "submit" }, "Go")
    ),
    state.result ? html.div({ class: "result" }, state.result) : null
]);
```

#### Event Handling Differences

**React:**
```jsx
<button onClick={handleClick}>Click me</button>
```

**pfusch:**
```javascript
html.button({ click: handleClick }, "Click me")
// Note: it's 'click', not 'onClick'
```

Event names in pfusch are the standard DOM event names (click, keydown, change), not React's camelCase versions.

#### Controlling Components

**React:** Controlled components use state, uncontrolled use refs.

```javascript
<input value={state.value} onChange={e => setState({ value: e.target.value })} />
```

**pfusch:** You don't have to control them in the first place, they are controlled by default. You actually don't want to, because that would mean rerendering the entire component on every change. Instead, you can just mutate the state directly:

```javascript
html.input({
  name: "value"
})
})
```

#### Component Communication

**React:** Props down, callbacks up + Context/Redux for complex state.

**pfusch:** Attributes down, custom events up + global message bus.

```javascript
// Parent component
pfusch("parent-component", { data: [] }, (state, trigger) => [
  html["child-component"]({ 
    items: state.data,
    // This becomes an attribute on the child
  })
]);

// Child component - triggers bubble up automatically
pfusch("child-component", { items: [] }, (state, trigger) => [
  html.button({
    click: () => trigger("itemSelected", { id: 123 })
    // This creates both a custom event AND a global message
    // Event: "child-component.itemSelected"
    // Global message: window.postMessage with event data
  }, "Select")
]);
```

#### Styling Gotchas

**The Shadow DOM Trap:** Unlike React, pfusch uses Shadow DOM, so external CSS won't penetrate:

```javascript
// ❌ This won't work - external styles don't penetrate Shadow DOM
// <style>my-component { color: red; }</style>

// ✅ Use the css helper inside the component
pfusch("my-component", {}, () => [
  css`
    :host {
      color: red; /* Styles the component itself */
    }
    .content {
      background: blue; /* Styles elements inside */
    }
  `,
  html.div({ class: "content" }, "Styled content")
]);

// ✅ Or use the global pfusch style tag
// <style id="pfusch-style">
//   .shared-class { margin: 10px; }
// </style>
```

#### Async Operations & Side Effects

**React way (useEffect):**
```jsx
useEffect(() => {
  fetchData().then(setData);
}, [dependency]);
```

**pfusch way (script + state subscription):**
```javascript
pfusch("data-component", { url: "", data: [] }, (state) => [
  script(async () => {
    // Subscribe to state changes
    state.subscribe("url", async (newUrl) => {
      if (newUrl) {
        state.data = await fetch(newUrl).then(r => r.json());
      }
    });
  }),
  html.ul(...state.data.map(item => html.li(item.name)))
]);
```

#### Setting attributes vs State

```javascript

// 
pfusch("my-component", { sometext: "" }, (state) => [
  html.div({ class: "content" }, state.sometext),
  script(() => {
    // Directly mutate state
    state.sometext = "Hello, pfusch!";
  })
]);

// Later, attributes are set directly on the element (not state)
const el = document.querySelector("my-component");
el.setAttribute("sometext", "oh look I changed the text!");  // This will retrigger rendering

```

#### Attribute Case Handling (Important!)

**HTML attributes are case-insensitive and get normalized to lowercase.** This can be confusing when working with camelCase JavaScript properties:

```javascript
// Your component state uses camelCase
pfusch("my-component", { 
  contentText: "hello",
  maxLength: 100,
  isVisible: true 
}, (state) => [...]);
```

**✅ All of these work:**
```html
<!-- Original camelCase (gets converted to lowercase by HTML) -->
<my-component contentText="Hello" maxLength="50" isVisible="true"></my-component>

<!-- Explicit lowercase (what HTML actually stores) -->
<my-component contenttext="Hello" maxlength="50" isvisible="true"></my-component>
```

**✅ Both of these work in JavaScript:**
```javascript
// Both camelCase and lowercase attribute names work
el.setAttribute("contentText", "Hello");     // Works
el.setAttribute("contenttext", "Hello");     // Also works
```

pfusch automatically handles the mapping between lowercase HTML attributes and camelCase JavaScript properties, so you don't have to worry about it! Well, except when you do. Like when you want to set it on the state directly, it does matter:

```javascript
pfusch("my-component", { contentText: "hello" }, (state) => [
  html.div({ class: "content" }, state.contentText),
  script(() => {
    // This will NOT update the contentText attribute
    state.contenttext = "Hello, pfusch!"; // This is lowercase!
    // This will update the contentText attribute
    state.contentText = "Hello, pfusch!"; // confusing, right?
  })
]);
```

#### 🚫 What You CAN'T Do (compared to React)

1. **No JSX:** You use the `html` proxy object instead
2. **No Hook Equivalents:** No useState, useEffect, useContext, etc.
3. **No Component Composition Patterns:** No higher-order components, render props, etc.
4. **No DevTools:** No React DevTools equivalent
5. **No Ecosystem:** No vast library ecosystem like React has

#### ✅ What You GET Instead

1. **Native Web Components:** Work everywhere, no framework lock-in
2. **Progressive Enhancement:** Enhance existing HTML instead of replacing it
3. **No Build Step:** Works directly in browsers
4. **Smaller Bundle:** 3.8K vs React's ~45K (even with tree shaking)
5. **Form Integration:** Native form association and submission


**Key insight:** pfusch blurs the line between DOM attributes and component state. Attributes can drive state changes, and state changes can be reflected as attributes.

#### Performance Considerations

- **Faster initial render:** No virtual DOM overhead
- **Potentially slower complex updates:** No batching like React
- **Memory usage:** Proxy objects for every component instance
- **Bundle size:** Much smaller, but no tree shaking benefits

#### Migration Tips

1. **Think DOM-first:** Instead of "How would React do this?", think "How would vanilla JS do this?"
2. **Embrace progressive enhancement:** Start with working HTML, then enhance
3. **Use semantic HTML:** pfusch works best when enhancing existing markup
4. **Keep components small:** No complex state management patterns available

Remember: pfusch is intentionally simple and different. Don't try to recreate React patterns—embrace the pfusch way!
