import { pfusch, script, css, html } from '../pfusch.js';
import { buttonStyle } from './button.style.js';

pfusch("my-list-element", { id: '', completed: false, text: "" }, (state, trigger) => [
    css`
        li {
            list-style: none;
            background-color: hsl(0, 0%, 50%);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 0.5rem;
            cursor: pointer;
        }
        li:hover { 
            background-color: hsl(0, 0%, 40%);
            color: var(--accent-color); 
        }
        li:active {
            background-color: hsl(0, 0%, 45%); 
        }
        li.completed {
            text-decoration: line-through;
            color: var(--primary-background-color); 
        }
    `,
    html.li({
        class: state.completed ? 'completed' : '',
        click: () => {
            state.completed = !state.completed;
            trigger("changed", state);
        }
    }, state.text)
])

pfusch("add-todo", (_, trigger) => [
    css`
    input {
        font-family: var(--font-family);
        border: 1px solid hsl(0, 0%, 50%);
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 0.5rem;
        cursor: pointer;
    }

    input:hover {
        background-color: hsl(0, 0%, 40%);
        color: var(--accent-color);
    }

    input:active {
        background-color: hsl(0, 0%, 45%);
    }
    `,
    html.label({ 'for': 'add-todo' }, '✒️'),
    html.input({
        type: 'text', placeholder: 'todo', keyup: (e) => {
            if (e.key === 'Enter') {
                trigger("add", e.target.value);
                e.target.value = '';
            }
        }
    }),
])

pfusch("my-list", { items: [] }, state => [
    css` ul { padding: 0; margin: 0; } `,
    html[`add-todo`]({
        items: state.items,
        add: ({ detail }) => state.items = [...state.items, { id: state.items.length + 1, completed: false, text: detail }]
    }),
    html.ul(
        ...state.items.map(item => html["my-list-element"]({
            ...item,
            changed: ({ detail }) => state.items = [...state.items.map(i => i.id === detail.id ? detail : i)]
        }))
    ),
])

pfusch("my-count", { count: 0 }, state => [
    css` p { font-size: 1.5rem; margin-left: 1rem; } `,
    html.p(`Count: ${state.count}`),
    buttonStyle('primary'),
    html.button({
        click: () => state.count++
    }, 'Increment'),
])

pfusch("todo-and-counter", { count: 0, items: [] }, (state) => [
    buttonStyle('secondary'),
    html.div({ id: 'my-component' },
        html[`my-list`]({ items: state.items }),
        html[`my-count`]({ count: state.count }),
        html.button({ click: () => (state.count = 0, state.items = [...state.items]) }, 'Reset everything')
    ),
    script(async () => {
        const data = await fetch("https://matthiaskainer.github.io/pfusch/example/data.json")
            .then(response => response.json());
        state.items = data.todos;
    })
]);