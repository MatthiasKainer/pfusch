# pfusch

![raw size](https://img.shields.io/badge/size-3.0K-green?label=size) ![gzipped](https://img.shields.io/badge/gzipped-1.4K-green?label=gzipped%20size)

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

### Wait, how did you do the SSR thing? My CTO says I can't use a framework without SSR!

do something like this:

```js
import puppeteer from 'puppeteer';

async function ssr(url) {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto(url, {waitUntil: 'networkidle0'});
  const html = await page.$eval('html', (element) => {
    return element.getInnerHTML({includeShadowRoots: true});
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

Every component will have this style applied, so you can define some base styles for your components.


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


### So I want to build a router component and...

STOP RIGHT THERE! This is not a SPA framework. This is a web component library. You can build a router component, but why would you? Routing is a server-side concern, and if you want to do client-side routing, you misunderstood web. &lt;/old-man-yelling-at-spa>

But really, this libary is thought to embrace what you get for free, namely html, standard css, and server side routing/rendering, and focused on progressive enhancement. If you want to build a SPA, you can do that, but you have to do it with the tools you have, not the tools you want.

### And whats with all that `html.*` things?

This gives you access to all html elements (and the elements you created). For html elements, do `html.name`, for web components do `html["name"]`. Any attributes & events can be passed as first argument, the inner content as second (as string or another `html.*`). If you don't have any attributes, just add the inner content.
