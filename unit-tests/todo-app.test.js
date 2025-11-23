import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, pfuschTest } from './pfusch-stubs.js';
import { pfusch, html, css, script } from '../pfusch.js';

let restore;

const initialTodos = [
  { id: 1, text: 'Learn pfusch', completed: false },
  { id: 2, text: 'Learn JavaScript ', completed: true },
  { id: 3, text: 'Learn html', completed: true }
];

test.before(() => {
  ({ restore } = setupDomStubs());
  defineTodoComponents();
});

test.after(() => {
  restore?.();
});

test('renders provided todos', async () => {
  const todoApp = pfuschTest('todo-app', { todos: initialTodos });
  await todoApp.flush();

  const items = todoApp.get('todo-item');
  assert.equal(items.length, initialTodos.length);

  const renderedTexts = items.map(item => item.get('.todo-text').textContent);
  assert.deepEqual(renderedTexts, initialTodos.map(todo => todo.text));
});

test('adds todos via form submission', async () => {
  const todoApp = pfuschTest('todo-app', {});
  todoApp.get('input').value = 'Write unit tests';
  todoApp.get('form').submit();
  await todoApp.flush();

  const items = todoApp.get('todo-item');
  assert.equal(items.length, 1);
  assert.equal(items.first.get('.todo-text').textContent, 'Write unit tests');
});

test('toggles completion with the checkbox', async () => {
  const todoApp = pfuschTest('todo-app', { todos: [{ id: 1, text: 'Click me', completed: false }] });
  await todoApp.flush();

  const checkbox = todoApp.get('todo-item').first.get('input[type="checkbox"]');
  assert.equal(checkbox.first.checked, false);

  checkbox.click();
  await todoApp.flush();
  assert.equal(todoApp.get('todo-item').first.get('input[type="checkbox"]').first.checked, true);
});

test('deletes todos when clicking delete', async () => {
  const todoApp = pfuschTest('todo-app', { todos: initialTodos });
  await todoApp.flush();

  const firstDeleteButton = todoApp.get('todo-item').first.get('button.delete-btn');
  firstDeleteButton.click();
  await todoApp.flush();

  const items = todoApp.get('todo-item');
  assert.equal(items.length, initialTodos.length - 1);

  const remainingTexts = items.map(item => item.get('.todo-text').textContent);
  assert(!remainingTexts.includes(initialTodos[0].text));
});

function defineTodoComponents() {
  pfusch('todo-item', { text: '', id: null, completed: false }, (state, trigger) => [
    css`
      .todo-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
      }
      .todo-item.completed .todo-text {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .todo-text {
        flex: 1;
        margin: 0 10px;
      }
      .delete-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
    html.div({
      class: `todo-item ${state.completed ? 'completed' : ''}`,
      id: `todo-${state.id}`
    },
      html.input({
        type: 'checkbox',
        checked: state.completed,
        change: () => {
          state.completed = !state.completed;
          trigger('toggle', state);
        }
      }),
      html.span({ class: 'todo-text' }, state.text),
      html.button({
        class: 'delete-btn',
        click: () => trigger('delete', state)
      }, 'Delete')
    )
  ]);

  pfusch('todo-app', { todos: [], nextId: 1 }, (state) => [
    css`
      .todo-app {
        max-width: 500px;
        margin: 20px auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
      }
      .todo-header {
        background: #f8f9fa;
        padding: 20px;
        border-bottom: 1px solid #ddd;
      }
      .todo-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
        box-sizing: border-box;
      }
      .todo-list {
        max-height: 300px;
        overflow-y: auto;
      }
      .empty-state {
        padding: 40px;
        text-align: center;
        color: #6c757d;
      }
    `,
    script(() => {
      state.subscribe('todos', (newTodos) => {
        if (Array.isArray(newTodos) && newTodos.length > 0) {
          const maxId = Math.max(...newTodos.map(todo => todo.id));
          if (maxId >= state.nextId) {
            state.nextId = maxId + 1;
          }
        }
      });
    }),
    html.div({ class: 'todo-app' },
      html.div({ class: 'todo-header' },
        html.h3('Todo List'),
        html.form({
          submit: (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            const todoText = data.get('todo-text');
            if (todoText && todoText.trim()) {
              state.todos = [...state.todos, {
                id: state.nextId++,
                text: todoText.trim(),
                completed: false
              }];
              e.target.reset();
            }
          }
        },
          html.input({
            class: 'todo-input',
            name: 'todo-text',
            placeholder: 'Add a new todo...'
          }),
          html.button({ type: 'submit' }, 'Add')
        )
      ),
      html.div({ class: 'todo-list' },
        state.todos.length === 0
          ? html.div({ class: 'empty-state' }, 'No todos yet. Add one above!')
          : state.todos.map(todo =>
            html['todo-item']({
              ...todo,
              'todo-item.toggle': (e) => {
                const index = state.todos.findIndex(t => t.id === e.detail.id);
                if (index >= 0) {
                  const newTodos = [...state.todos];
                  newTodos[index] = { ...newTodos[index], ...e.detail };
                  state.todos = newTodos;
                }
              },
              'todo-item.delete': (e) => {
                state.todos = state.todos.filter(t => t.id !== e.detail.id);
              }
            })
          )
      )
    )
  ]);
}
