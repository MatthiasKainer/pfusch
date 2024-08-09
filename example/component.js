import { pfusch, script, css, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("my-list-element", { id: '', completed: false, text: "" }, state => [
    css`
        li { cursor: pointer; margin: 2rem 0.5em; }
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
    css`button { padding: 1rem; background-color: #f0f; color: #fff; cursor: pointer; }`,
    html.button({
        click: () => state.count++
    }, 'Increment'),
])

pfusch("my-component", { count: 0, items: [] }, (state) => [
    html.div({ id: 'my-component' },
        html[`my-list`]({ items: state.items }),
        html[`my-count`]({ count: state.count }),
        html.button({ click: () => state.count = 0 }, 'Reset')
    ),
    script(async () => {
        const data = await fetch("https://matthiaskainer.github.io/pfusch/example/data.json")
                .then(response => response.json());
        state.items = data.todos;
    })
]);