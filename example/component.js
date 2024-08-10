import { pfusch, script, css, html } from 'https://matthiaskainer.github.io/pfusch/pfusch.js';

pfusch("my-list-element", { id: '', completed: false, text: "" }, state => [
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

const buttonStyle = (type) => css`
    button {
        background-color: var(--${type}-color);
        border-radius: 8px;
        border-style: none;
        box-sizing: border-box;
        color: #FFFFFF;
        cursor: pointer;
        display: inline-block;
        font-size: 14px;
        font-weight: 500;
        height: 40px;
        line-height: 20px;
        list-style: none;
        margin: 0;
        outline: none;
        padding: 10px 16px;
        position: relative;
        text-align: center;
        text-decoration: none;
        transition: color 100ms;
        vertical-align: baseline;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
    }

    button:hover,
    button:focus {
        background-color: var(--${type}-color-state);
    }

    button:active { background-color: var(--${type}-color);color: var(--${type}-color-state); }`;


pfusch("my-count", { count: 0 }, state => [
    html.p(`Count: ${state.count}`),
    buttonStyle('primary'),
    html.button({
        click: () => state.count++
    }, 'Increment'),
])

pfusch("my-component", { count: 0, items: [] }, (state) => [
    buttonStyle('secondary'),
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