import { pfusch, css, html } from '../pfusch.js';
import { todoAddStyle, todoItemStyle } from './todo.style.js';
import { buttonStyle } from './button.style.js';

pfusch("todo-item", { completed: false, text: "" }, (state, trigger) => [
    todoItemStyle,
    html.li({
    },
        html.input({
            id: `todo-${state.id}`,
            type: 'checkbox',
            'aria-label': `Mark ${state.text} as ${state.completed ? 'not completed' : 'completed'}`,
            ...(state.completed ? { checked: true } : {}),
            click: () => {
                state.completed = !state.completed;
                trigger("changed", state);
            }
        }),
        html.label({ for: `todo-${state.id}` }, state.text),
        html.button({
            click: () => {
                trigger("delete", state);
            },
            'aria-label': `Delete ${state.text}`
        }, '❌')
    )
])

pfusch("todo-add", (_, trigger) => [
    todoAddStyle,
    buttonStyle('primary'),
    html.form(
        {
            submit: (e) => {
                e.preventDefault();
                trigger("add", e.target[0].value);
                e.target[0].value = '';
            }
        },
        html.i('✒️'),
        html.input({
            id: 'add-todo',
            type: 'text',
            placeholder: 'todo',
            'aria-label': 'Add a new todo'
        }),
        html.button({
            type: 'submit',
        }, 'Add'),
    )
])

pfusch("todo-list", { id: "my-list", items: [], feedback: null }, state => [
    css` ul { padding: 0; margin: 0; } `,
    html.h2('Todo List'),
    html[`todo-add`]({
        items: state.items,
        add: ({ detail }) => {
            state.items = [...state.items, { id: state.items.length + 1, completed: false, text: detail }]
            state.feedback = `Added "${detail}" to your todo list`;
        }
    }),
    html.ul(
        ...state.items.map((item) => html["todo-item"]({
            id: item.id,
            ...item,
            changed: ({ detail }) => {
                state.items = [...state.items.map(i => i.id === detail.id ? detail : i)]
                state.feedback = `Marked "${detail.text}" as ${detail.completed ? 'completed' : 'not completed'}`;
            },
            delete: ({ detail }) => {
                state.items = [...state.items.filter(i => i.id !== detail.id)]
                state.feedback = `Deleted "${detail.text}" from your todo list`;
            }
        }))
    ),
    html.div({
        role: 'status',
        'aria-live': 'polite',
    }, state.feedback)
])