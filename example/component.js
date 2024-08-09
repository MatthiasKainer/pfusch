import { pfusch, script, css, html } from '../pfusch.js';

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
        const data = await fetch("/pfusch/example/data.json")
                .then(response => response.json());
        state.items = data.todos;
    })
]);