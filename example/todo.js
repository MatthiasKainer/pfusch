import { pfusch, css, html } from '../pfusch.js';
import { todoAddStyle, todoItemStyle } from './todo.style.js';

pfusch("todo-item", { completed: false, text: "" }, (state, trigger) => [
    todoItemStyle,
    html.li({
        class: state.completed ? 'completed' : '',
        click: () => {
            state.completed = !state.completed;
            trigger("changed", state);
        }
    }, state.text)
])

pfusch("todo-add", (_, trigger) => [
    todoAddStyle,
    html.label({ 'for': 'add-todo' }, '✒️'),
    html.input({
        type: 'text', 
        placeholder: 'todo', 
        keyup: (e) => {
            if (e.key === 'Enter') {
                trigger("add", e.target.value);
                e.target.value = '';
            }
        }
    }),
])

pfusch("todo-list", { id: "my-list", items: [] }, state => [
    css` ul { padding: 0; margin: 0; } `,
    html[`todo-add`]({
        items: state.items,
        add: ({ detail }) => state.items = [...state.items, { id: state.items.length + 1, completed: false, text: detail }]
    }),
    html.ul(
        ...state.items.map((item, index) => html["todo-item"]({
            id: item.id,
            ...item,
            changed: ({ detail }) => state.items = [...state.items.map(i => i.id === detail.id ? detail : i)]
        }))
    ),
])