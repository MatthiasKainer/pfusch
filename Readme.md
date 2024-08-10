# pfusch

![raw size](https://img.shields.io/badge/size-2.2K-green?label=size) ![gzipped](https://img.shields.io/badge/gzipped-1.1K-green?label=gzipped%20size)


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
import { pfusch, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.min.js';

pfusch("hello-world", () => [
    html.div(
        html.h1`hello`,
        html.p`world!`
    )
]);
```

4. Go nuts with state and styles and stuff

```js
import { pfusch, script, css, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.min.js';

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
    html.button({ click: () => state.count++ }, 'Increment')
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

## Build

No need. I minify it and get he sizes fo the badges are gather via

```shell
npx terser pfusch.js --module --compress --mangle > pfusch.min.js
ls -lh pfusch.min.js | awk '{print $5}';
gzip -k -9 pfusch.min.js; ls -lh pfusch.min.js.gz | awk '{print $5}'; rm -f pfusch.min.js.gz
```

## I have questions...

### Can I use this in production?
Absolutely not. I build the framework in a rage and in very little time, and most of the time spend on this project went into the github page. If you want to do something quickly without npm installing the internet and fighting with webpack and friends, then this might be a good choice. 

Then again, people are using React in production, and the license is MIT so I'm not liable - so knock yourself out.

### How to use it?

Kinda like above in the readme. There are more examples in the [example](example/) folder. You'll figure it out...

### Come on, some hints!

Alright. So basically, for every component you want to create, you use the `pfusch` method, which has the following signature:

```js
pfusch("name": string, initialState: { [key:string]: any }, (state: initialState, trigger: ("eventName": string, detail: any)) => [
    // ...array of elements, styles and scripts
])
```

The initial state are also automatically becoming attributes on your component, so feel free to set them in HTML directly.

For instance:

```js
pfusch("hello-world", { who: "world" }, (state) => [
    html.div(
        html.h2`hello ${who}`,
        html.h1`pfusch!`
    )
]);
```

and html

```html
<hello-world who="me!"></hello-world>
```

will show:

> hello me!

If state is updated, either inside the component or via an attribute change, the value will change. State changes are one-directional, so changing the state inside the component will not change the attribute. If you want to bubble up, do it via event. The easiest way for that is the `trigger` function that is passed as second argument after the state: 

```js
pfusch("my-triggerydo", { clicked: 0 }, ({clicked}, trigger) => [
    html.button({
        click: () => {
            clicked++;
            trigger("clickCount", clicked);
        }
    }, `Clicked me ${clicked}`)
])
```

### And whats with all that `html.*` things?

This gives you access to all html elements (and the elements you created). For html elements, do `html.name`, for web components do `html["name"]`. Any attributes & events can be passed as first argument, the inner content as second (as string or another `html.*`). If you don't have any attributes, just add the inner content.