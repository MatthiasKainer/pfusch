# pfusch unit tests

`unit-tests/pfusch-stubs.js` provides a tiny DOM so pfusch components can be tested with `node:test` and `assert` (yes, again no npm install needed).

- Boot the stubs before defining components:  
  ```js
  import { setupDomStubs, pfuschTest } from './pfusch-stubs.js';
  import { pfusch, html } from '../pfusch.js';

  const { restore } = setupDomStubs();
  pfusch('my-widget', {}, () => [html.div('hi')]);
  ```
- Load a real HTML fixture into the fake document with `loadBaseDocument('./path/to/index.html')`. This parses the `<body>` and connects custom elements so `children()` works as expected.
- Mount components with `pfuschTest(tagName, attributes)`. Attributes are set on the element, objects/arrays are stringified for you.
- Chain `.get(selector)` to keep drilling into the tree (shadow DOMs are traversed automatically). Helpers: `.length`, `.value`, `.checked`, `.textContent`, `.click()`, `.submit()`, `.at(index)`, `.elements` (raw nodes), `.map(cb)` and `await .flush()` to let scheduled renders complete.
  
  
## Example
```js
test('adds todos via form submission', async () => {
  const widget = pfuschTest('todo-app', {
    todos: [
      { id: 1, text: 'Write tests', completed: false }
    ] 
  });
  await widget.flush();
  assert.equal(widget.get('todo-item').length, 1);
  widget.get('input').value = 'Ship docs';
  widget.get('form').submit();
  await widget.flush();
  assert.equal(widget.get('todo-item').length, 2);
});
```

Load a base document fixture:

```js
import { setupDomStubs, loadBaseDocument } from './pfusch-stubs.js';

const { restore } = setupDomStubs();
await import('./social-example/social.js');
const root = await loadBaseDocument('./social-example/index.html');

const form = root.get('post-form');
const feed = root.get('post-feed');
await feed.flush();

restore();
```
Run the suite with `npm test`.

Call `restore()` in an `after` hook if the globals need to be reset.
