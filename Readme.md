# pfusch

![raw size](https://img.shields.io/badge/size-3.7K-green?label=size) ![gzipped](https://img.shields.io/badge/gzipped-1.8K-green?label=gzipped%20size)

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
import {
  pfusch,
  html,
} from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";

pfusch("hello-world", () => [html.div(html.h1`hello`, html.p`world!`)]);
```

4. Use it wisely by progressively enhancing your page

```html
<table-wrapper url="example/items.json">
  <table>
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th>Column 3</th>
      </tr>
    </thead>
    <tbody id="table-body">
      <tr>
        <td>prerendered item</td>
        <td>100</td>
        <td>yes</td>
      </tr>
    </tbody>
  </table>
</table-wrapper>
```

```js
import { pfusch, script, html } from "../pfusch.js";

pfusch(
  "table-wrapper",
  { url: "/example/items.json", items: [], selectedId: null },
  (state) => [
    script(async () => {
      state.items = await fetch(`${state.url}`).then((response) =>
        response.json()
      );
    }),
    html.tbody(
      {
        id: "table-body",
      },
      ...state.items.map((item) =>
        html.tr(
          html.td(item.name),
          html.td(item.price),
          html.td(item["in stock"] ? "yes" : "no")
        )
      )
    ),
  ]
);
```

5. Go nuts and use it like a SPA with state and styles and stuff

```js
import {
  pfusch,
  script,
  css,
  html,
} from "https://matthiaskainer.github.io/pfusch/pfusch.min.js";

pfusch("my-list-element", { id: "", completed: false, text: "" }, (state) => [
  css`
    li {
      cursor: pointer;
    }
    li:hover {
      color: #f0f;
    }
    .completed {
      text-decoration: line-through;
    }
  `,
  html.li(
    {
      id: `li-${state.id}`,
      class: state.completed ? "completed" : "",
      click: () => {
        state.completed = !state.completed;
      },
    },
    state.text
  ),
]);

pfusch("my-list", { items: [] }, (state) => [
  html.ul(...state.items.map((item) => html["my-list-element"]({ ...item }))),
]);

pfusch("my-count", { count: 0 }, (state) => [
  html.p(`Count: ${state.count}`),
  html.button({ click: () => state.count++ }, "Increment"),
]);

pfusch("my-component", { count: 0, items: [] }, (state) => [
  html.div(
    { id: "my-component" },
    html[`my-list`]({ items: state.items }),
    html[`my-count`]({ count: state.count }),
    html.button({ click: () => (state.count = 0) }, "Reset")
  ),
  script(async () => {
    const data = await fetch("./data.json").then((response) => response.json());
    state.items = data.todos;
  }),
]);
```

See it in action on https://matthiaskainer.github.io/pfusch/

For more information and detailed documentation, please refer to the official `pfusch` documentation. Which doesn't exist. Happy trial and error!

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

Absolutely not. I build the framework in a rage and in very little time, and most of the time spend on this project went into the github page. If you want to do something quickly without npm installing the internet and fighting with webpack and friends, then this might be a good choice.

Then again, people are using React in production, and the license is MIT so I'm not liable - so knock yourself out.

### How to use it?

Kinda like above in the readme. There are more examples in the [example](example/) folder. You'll figure it out...

### Come on, some hints!

Alright. So basically, for every component you want to create, you use the `pfusch` method, which has the following signature:

```js
pfusch(
    "name": string, 
    initialState: { [key:string]: any }, 
    (state: initialState, trigger: ("eventName": string, detail: any)) => [
    // ...array of elements, styles and scripts
])
```

The initial state are also automatically becoming attributes on your component, so feel free to set them in HTML directly.

For instance:

```js
pfusch("hello-world", { who: "world" }, (state) => [
  html.div(html.h2`hello ${who}`),
]);
```

and html

```html
<hello-world who="me!"></hello-world>
```

will show:

> hello me!

Now as lovely as this is, this library is about progressive enhancement, so let's show how this enhances specific parts of the page:

```html
<body>
  <div>
    <hello-world who="me!">
      <h2>Hello <span id="who">...</span>!</h2>
    </hello-world>
  </div>
  <script type="module">
    import { pfusch, html, css } from "../../pfusch.js";

    pfusch("hello-world", { who: "..." }, ({ who }) => [
      css(`h1, h2 { text-align: center; width: 100%; }`),
      html.span({ id: "who" }, who),
    ]);
  </script>
</body>
```

Which will also show

> hello me!

But this time you far more control on the layout and the content of the component. And only when the state is changed, the part you want to change, will be changed. All the rest you can statically render and provide to the user at maximum speed. And yes, this also works with server-side rendering. If you prerender this with a headless browser, you will get something like

```html
<div>
  <hello-world who="me!" as="lazy">
    <template shadowrootmode="open">
      <h2>Hello <span id="who">me!</span>!</h2>
    </template>
    <h2>Hello <span id="who">...</span>!</h2>
  </hello-world>
</div>
```

which, once you add the script and maybe change the attribute to `who="world"`, will update to show `Hello world!`. The `as="lazy"` attribute tells the component to only update the component if the initial state changes (in this case, `me!`), avoiding any flickering.

If state is updated, either inside the component or via an attribute change, the value will change. State changes are one-directional, so changing the state inside the component will not change the attribute. If you want to bubble up, do it via event. The easiest way for that is the `trigger` function that is passed as second argument after the state:

```js
pfusch("my-triggerydo", { clicked: 0 }, ({ clicked }, trigger) => [
  html.button(
    {
      click: () => {
        clicked++;
        trigger("clickCount", clicked);
      },
    },
    `Clicked me ${clicked}`
  ),
]);
```

Trigger will not only register this as event for this element, but also post a message with the event name `${tagName}.${eventName}`, so in this case `my-triggerydo.clickCount` and data in the form `{ sourceId, data }`, allowing you to globally register to changes in elements without caring where they are (or if they are).

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

### What's that as=interactive thing?

Pfusch-Elements with the `as=interactive` attribute will not be overwritten with new inner elements, but only enhanced with functionality. A simple example is the tab component from the example folder:

```html 
    <style id="pfusch-style">
        a-tab-header {
            display: inline-block;
            padding: 1rem;
            cursor: pointer;
        }
        a-tab-header:hover {
            background-color: var(--primary-color-state);
        }
        a-tab-header.active {
            background-color: var(--primary-color);
        }
        a-tab-item {
            display: none;
        }
        a-tab-item.active {
            display: block;
            border: 1px solid var(--primary-color);
            padding: 1rem;
        }
    </style>
    <a-tab>
        <a-tab-header class="active">
            Tab 1
        </a-tab-header>
        <a-tab-header>
            Tab 2
        </a-tab-header>
        <a-tab-item class="active">
            Hello on tab 1
        </a-tab-item>
        <a-tab-item>
            Hello on tab 2
        </a-tab-item>
    </a-tab>
```

This gives us a tab view, but without any logic, which we add with the following script:

```js
import { pfusch, html } from "../pfusch.js";

const setTabActivityState = (state) => (element, index) => {
    if (state.activeIndex === index) {
        element.classList.add("active");
    } else {
        element.classList.remove("active");
    }
}

pfusch("a-tab", { activeIndex: 0 }, state => [
    html[`a-tab-header`]({
        as: "interactive",
        apply: setTabActivityState(state),
        click: (e) => {
            state.activeIndex = e.target.index;
        },
    }),
    html[`a-tab-item`]({
        as: "interactive",
        apply: setTabActivityState(state)
    })
])
```

Now, as soon as the script is loaded, the tabs will be interactive and you can switch between them. The `apply` function is called for every element that has the `as=interactive` attribute every time the state changes, allowing you to react on state changes. It gives you the element and the index of the element in the array of elements of this type that belongs to the same parent.

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


### So I want to build a router component and...

STOP RIGHT THERE! This is not a SPA framework. This is a web component library. You can build a router component, but why would you? Routing is a server-side concern, and if you want to do client-side routing, you misunderstood web. &lt;/old-man-yelling-at-spa>

But really, this libary is thought to embrace what you get for free, namely html, standard css, and server side routing/rendering, and focused on progressive enhancement. If you want to build a SPA, you can do that, but you have to do it with the tools you have, not the tools you want.

### And whats with all that `html.*` things?

This gives you access to all html elements (and the elements you created). For html elements, do `html.name`, for web components do `html["name"]`. Any attributes & events can be passed as first argument, the inner content as second (as string or another `html.*`). If you don't have any attributes, just add the inner content.
