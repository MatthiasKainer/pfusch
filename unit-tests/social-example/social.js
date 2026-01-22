import { pfusch, html, css, script } from "../../pfusch.min.js";

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