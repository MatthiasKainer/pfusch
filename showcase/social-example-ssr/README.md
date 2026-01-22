# 🐦 Pfusch Social

A fully functional lightweight and totally not feature complete inmemory Twitter clone built with [pfusch](https://github.com/MatthiasKainer/pfusch) - demonstrating progressive enhancement, SSR, and test-driven development. Aka, you can disable javascript and it still works (like without the fancy bits ie characters left on typing).

## Features

- **📝 Post Messages** - Create posts with character count (280 limit)
- **❤️ Like Posts** - Like/unlike your own posts!
- **🔄 Reshare Posts** - Reshare content with yourself!
- **📱 Progressive Enhancement** - Works without JavaScript via forms
- **🖥️ SSR Support** - Server-side rendering with Puppeteer
- **👤 Single User** - You will be alice. You will stay alice. Hello, alice!
- **#️⃣ Clickable Hashtags** - Click any hashtag to filter the feed!
- **🗑️ Forgets everything when restarted** - it's like the internet you always wanted: one without long term memory!

With javascript enabled, you also get:
- **📝 Character Count** - Live character count when typing!
- **🎨 Slightly nicer UI** - because computed styles and SSRs are not best friends due to schoping sloping something.

## Running the Application

### Download puppeteer
```bash
npm install
```

### Start the server
```bash
node server.js
```
Visit http://localhost:3000 and turn javascript on and off to get totally blown away how this still works. Like, really, go ahead, try it. A web app that works without javascript, what sorcery is this? We are truly living in the future.

### Run tests
```bash
npm test
# or for people that love to type, and to prove it's not secretly using mocha or jest
node --test tests/*.test.js
```

## Progressive Enhancement

The app works without JavaScript through standard HTML forms:

1. **Creating posts**: The form has `action="/api/posts/create" method="POST"`, which POSTs to the server and redirects back.

2. **Liking/Resharing**: Each action button is wrapped in a form that POSTs to the API and redirects.

3. **Filtering**: Clicking hashtags without JS navigates to `/?filter=hashtag`.

When JavaScript loads, pfusch enhances these interactions:
- Forms submit via `fetch()` instead of full page reload
- Events coordinate between components
- UI updates instantly without refresh

## Test-Driven Development

Tests are written as user stories, focusing on what users can do:

```javascript
test('user can type a message and submit the form to create a post', async () => {
  const postForm = root.get('feed-post');
  const textarea = postForm.get('textarea[name="content"]');
  textarea.value = 'My first tweet! #hello';
  
  const form = postForm.get('form');
  form.submit();
  await postForm.flush();

  const calls = globalThis.fetch.getCalls();
  const postCall = calls.find(c => c.url.includes('/api/posts/create'));
  assert.ok(postCall, 'A POST request should be made');
});
```

## SSR Details

The app supports SSR via Puppeteer's `getHTML()` with serializable shadow roots:

```javascript
const html = await page.$eval('html', (element) => {
  return element.getHTML({ 
    includeShadowRoots: true, 
    serializableShadowRoots: true 
  });
});
```

This serializes the shadow DOM, so the page renders fully without JavaScript. When JS loads, pfusch hydrates and enhances the components.

## Dependencies

- **Runtime**: None (pure Node.js server). Well, and puppeteer for SSR, but thats only like 100MB and thus doesn't count.
- **Testing**: Node.js built-in `node:test` and `node:assert`
