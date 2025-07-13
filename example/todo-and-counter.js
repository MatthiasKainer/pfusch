import { pfusch, script, css, html } from '../pfusch.js';
import { buttonStyle } from './button.style.js';

pfusch("my-count", { count: 0 }, state => [
    css` p { font-size: 1.5rem; margin-left: 1rem; } `,
    html.h2('Counter'),
    html.p(`Count: ${state.count}`),
    buttonStyle('primary'),
    html.button({
        click: () => state.count++
    }, 'Increment'),
])  

pfusch("todo-and-counter", { id: "todo-and-counter", count: 0, items: [] }, (state) => [
    buttonStyle('secondary'),
    html.div({ id: 'my-component' },
        html[`todo-list`]({ items: state.items }),
        html[`my-count`]({ count: state.count }),
        html.button({ click: () => (state.count = 0, state.items = [...state.items]) }, 'Reset everything')
    ),
    script(async () => {
        const data = await fetch("https://matthiaskainer.github.io/pfusch/example/data.json")
            .then(response => response.json());
        state.items = data.todos;
    })
]);
