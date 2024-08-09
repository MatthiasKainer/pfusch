# pfusch

> pfusch [pfʊʃ]: Austrian slang word refering to work that is done carelessly, unprofessionally, or without proper skill, resulting in poor quality or subpar results. 

Pfusch is a super-minimal web component library, that you can (and should) use without any bundler, minifier, builder, transpiler or thingamajig. 

## Using `pfusch`

To use `pfusch` in your project, follow these steps:

1. Create a javascript file like it's in 1998

```bash
touch hello-world.js
```

2. Add it to a html file like it's 2024, so with a web component

```html
<html>
    <head>
        <title>Pfusch!</title>
    </head>
    <body>
        <hello-world></hello-world>
        <script src="hello-world.js" type="module"></script>
    </body>
</html>
```

3. Start using `pfusch` in your `hello-world.js`:

```javascript
import { pfusch, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("hello-world", () => [
    html.div(
        html.h1`hello`,
        html.p`world!`
    )
]);
```

4. Go nuts with state and styles and stuff

```js
import { pfusch, script, css, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("my-list-element", { id: '', completed: false, text: "" }, state => [
    css`
        li { cursor: pointer; }
        li:hover { color: #f0f; }
        .completed { text-decoration: line-through; }
    `,
    html.li({
        id: `li-${state.id}`,
        class: state.completed ? 'completed' : '',
        click: () => {
            state.completed = !state.completed;
        }
    }, state.text)
])

pfusch("my-list", { items: [] }, state => [
    html.ul(
        ...state.items.map(item => html["my-list-element"]({ ...item }))
    ),
])

pfusch("my-count", { count: 0 }, state => [
    html.p(`Count: ${state.count}`),
    html.button({
        id: 'increment',
        click: () => state.count++
    }, 'Increment')
])

pfusch("my-component", { count: 0, items: [] }, (state) => [
    html.div({ id: 'my-component' },
        html[`my-list`]({ items: state.items }),
        html[`my-count`]({ count: state.count }),
        html.button({ click: () => state.count = 0 }, 'Reset')
    ),
    script(async () => {
        const data = await fetch("./data.json")
                .then(response => response.json());
        state.items = data.todos;
    })
]);
```

See it in action on https://matthiaskainer.github.io/pfusch/

For more information and detailed documentation, please refer to the official `pfusch` documentation. Which doesn't exist. Happy trial and error!
