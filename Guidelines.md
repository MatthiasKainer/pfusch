# Full Pfusch Development Guidelines

This document outlines the key patterns and best practices when developing applications with `pfusch`. It covers progressive enhancement, state management, component communication, lifecycle handling, styling, form integration, and testing.

## 1. The Light DOM Bridge
`pfusch` is designed for **Progressive Enhancement**. 
*   **The Rule**: Always write your content in the HTML file first.
*   **Accessing Content**: Inside the template function, use the `children` helper.
    *   `children()` returns all original child nodes.
    *   `children('selector')` (like `children('form')`) filters them.
*   **The Shadow Boundary**: Remember that `this.querySelector` looks *inside* the component's generated template. `children()` can also see the original light DOM children provided by the user.
*   **Use html.slot()**: To render light DOM children inside your template, use `html.slot()` where you want them to appear.

## 2. Reactive State (The Proxy Way)
`pfusch` uses JavaScript Proxies to detect changes.
*   **Direct Mutation**: Do not use `setState`. Simply write `state.count++`.
*   **Array Updates**: When updating lists, re-assign the array to trigger the proxy: `state.items = [...state.items, newItem]`.
*   **Nested Objects**: Changes to nested need to be re-assigned as well: `state.user = { ...state.user, name: 'New Name' }`.
*   **Attribute Sync**: Any key in your `initialState` object is automatically watched as an HTML attribute. Changing `<my-comp count="4">` to `<my-comp count="5">` updates `state.count` automatically.

## 3. Component Communication
To keep components loosely coupled, avoid direct references.
*   **Downwards**: Use Attributes/Props.
*   **Upwards**: Use `trigger("eventName", data)`.
*   **The Prefix Convention**: `trigger("saved")` inside `<user-profile>` becomes a global `window` event named `user-profile.saved`. Other components should listen to this global event, or alternatively the window message in their `script()` block.
*  **Event attribute names**: Events are standard DOM events, so you can listen to them with `addEventListener` or `eventName` attributes in HTML. Do NOT use `onEventName` attributes, always without the `on` prefix.

## 4. Lifecycle & Side Effects
The `script(function() { ... })` helper is your primary tool for logic.
*   **Execution**: It runs once when the component is mounted.
*   **Subscription**: Use `state.subscribe('key', callback)` to react to specific state changes.
*   **Scope**: `this` refers to the custom element itself.
*   **Cleanup**: Use `this.component.addEventListener('disconnected', ...)` inside the script to clean up intervals or global listeners.

## 5. Styling & Design Systems
Because of the Shadow DOM, external CSS (like Bootstrap or Tailwind) won't apply to elements *inside* your component template by default.
*   **Internal Styles**: Use the `css` helper for component-specific logic.
*   **Global Injection**: Add `data-pfusch` to your `<link rel="stylesheet">` tags in the `<head>`. `pfusch` will automatically clone these styles into every component's shadow root.
*   **Base Styles**: A `<style id="pfusch-style">` in your document will be treated as "Base Styles" and injected into every component.

## 6. Form Integration
`pfusch` components are **Form Associated**. 
*   If you put a `pfusch` component inside a `<form>`, its `state` is automatically serialized and included when the form is submitted.
*   This makes `pfusch` excellent for creating custom inputs (like star ratings or date pickers) that behave like native HTML inputs.
*   Give it a Name: Always provide a name attribute/state property to your component if it's inside a form. This acts as the key in the submitted data.
*   JSON Serialization: Remember that the server will receive a JSON string of your state object. You'll likely need to JSON.parse it on your backend or in your submit handler.
*   Implicit Updates: You don't need to do anything special to "save" the value for the form; simply updating state.anyProperty is enough for pfusch to sync with the form internals.

## 7. Testing (Node-Only)
`pfusch` ships with a DOM stub so you can test components with **just Node.js**.
*   **Boot the stubs first**: Call `setupDomStubs()` before defining components (it installs globals).
*   **Import pfusch for tests**: Use `import_for_test(modulePath, [pfuschPath])` to rewrite CDN imports to local files, either downloading pfusch or pointing to your local copy.
*   **Use real HTML fixtures**: `loadBaseDocument('./path/to/index.html')` parses the `<body>` into the fake DOM and connects custom elements.
*   **Mount with `pfuschTest`**: For testing without document `pfuschTest(tagName, attributes)` creates the element and returns a helper collection.
*   **Query helpers**: `.get(selector)` traverses light + shadow DOM. Use `.value`, `.checked`, `.textContent`, `.click()`, `.submit()`, `.at(index)`, `.first`, and `await .flush()` to wait for re-renders.
*   **Mock fetch**: The stubs include a mock `fetch()` with `addRoute(url, response)` and `getCalls()` to inspect calls.
*   **Test User Stories**: Write tests that simulate user interactions, focusing on what users can do rather than implementation details.
*   **Cleanup**: Call `restore()` in an `after` hook to reset globals.

Example test:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, loadBaseDocument } from './unit-tests/pfusch-stubs.js';

let restore;
let root;
const initialPosts = [
  { id: 1, title: 'Hello Pfusch', body: 'First post', userId: 1 }
];
const createdPost = {
  id: 99,
  title: 'From the form',
  body: 'Created in the test',
  userId: 1
};

test.before(async () => {
  ({ restore } = setupDomStubs());

  globalThis.fetch.resetRoutes();
  globalThis.fetch.addRoute('posts', createdPost);
  globalThis.fetch.addRoute('posts?_limit=5', initialPosts);

  await import_for_test('./unit-tests/social-example/social.js');
  root = await loadBaseDocument('./unit-tests/social-example/index.html');
});

test.after(() => {
  restore?.();
});

test('When the user posts a new post, it appears on top of the feed', async () => {
  const form = root.get('post-form');
  const feed = root.get('post-feed');
  await feed.flush();

  assert.equal(feed.get('.post').length, 1);

  form.get('input[name="title"]').value = 'New title';
  form.get('textarea[name="body"]').value = 'New body';
  form.get('form').submit();
  await form.flush();
  await feed.flush();

  assert.equal(feed.get('.post').length, 2);
  assert.equal(feed.get('.post').first.get('h3').textContent, createdPost.title);
});
```

# Example putting it together

This example follows the Pfusch philosophy: we'll start with a standard HTML form (Progressive Enhancement), use a central "Feed" to manage the list, and a small helper component to fetch user names on-demand.

## 1. The HTML Structure

We provide a functional form that would work with a standard backend, and a placeholder for our feed.

```html
// index.html
<div class="container">
  <h1>Social Pfusch</h1>

  <!-- Progressive Enhancement: This form works without JS! -->
  <post-form>
    <form action="https://jsonplaceholder.typicode.com/posts" method="POST">
      <input type="text" name="title" placeholder="What's on your mind?" required>
      <textarea name="body" placeholder="Tell us more..." required></textarea>
      <!-- Hardcoded userId for the example -->
      <input type="hidden" name="userId" value="1"> 
      <button type="submit">Post to Feed</button>
    </form>
  </post-form>

  <hr>

  <!-- Our interactive feed -->
  <post-feed></post-feed>
</div>
```

## 2. The Implementation (pfusch.js)

This example demonstrates Form Enhancement, Component Nesting, and Async Data Handling.

```javascript
// social.js
import { pfusch, html, css, script } from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";

// 1. User Name Component
pfusch("user-name", { userId: null, name: "Loading..." }, (state) => [
  script(async function() {
    if (state.userId && state.name === "Loading...") {
      const user = await fetch(`https://jsonplaceholder.typicode.com/users/${state.userId}`)
        .then(r => r.json());
      state.name = user.name;
    }
  }),
  html.span({ class: "author" }, `By: ${state.name}`)
]);

// 2. Post Form (The Enhancement Pattern)
pfusch("post-form", { loading: false }, (state, trigger, { children }) => [
  css`
    form { display: flex; flex-direction: column; gap: 10px; max-width: 400px; }
    .submitting { opacity: 0.5; pointer-events: none; }
  `,
  script(function() {
    // Correct way to find the form in the Light DOM
    const [form] = children('form'); 
    
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        state.loading = true;

        const body = Object.fromEntries(new FormData(form));
        const response = await fetch(form.action, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-type': 'application/json; charset=UTF-8' }
        }).then(r => r.json());

        trigger("created", response); // Fires "post-form.created"
        form.reset();
        state.loading = false;
      });
    }
  }),
  // Render original form, wrapped in a div to apply reactive classes
  html.div({ class: state.loading ? 'submitting' : '' }, ...children()),
  state.loading ? html.p("📤 Sending...") : null
]);

// 3. Post Feed (The Orchestrator)
pfusch("post-feed", { posts: [] }, (state) => [
  css`
    .post { border-bottom: 1px solid #eee; padding: 1rem 0; }
    .author { font-size: 0.8rem; color: #666; font-style: italic; }
  `,
  script(async function() {
    const data = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5').then(r => r.json());
    state.posts = data;

    window.addEventListener("post-form.created", (e) => {
      state.posts = [e.detail, ...state.posts];
    });
  }),
  html.h2("Recent Posts"),
  ...state.posts.map(post => 
    html.div({ class: "post" },
      html.h3(post.title),
      html["user-name"]({ userId: post.userId }),
      html.p(post.body)
    )
  )
]);
```
