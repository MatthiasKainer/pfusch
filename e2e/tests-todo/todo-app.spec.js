const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3030');
    // wait until network is idle
    await page.waitForLoadState('networkidle');
    // let scripts execute
    await page.waitForTimeout(1000);
});

const todoApp = async (page) => {
    // No need to click tabs anymore - todo-app is directly visible
    const todoList = page.locator('.todo-list').first();
    const todoInput = page.locator('.todo-input').first();

    const addTodoItem = async (text) => {
        await todoInput.fill(text);
        await todoInput.press('Enter');
        return getTodoItem(text);
    }

    const getTodoItem = (text) => {
        // Find the todo-item custom element with the correct text
        const element = page.locator('todo-item').filter({ hasText: text }).first();

        const change = async () => {
            // Click the checkbox inside the todo-item
            await element.locator('input[type="checkbox"]').click();
        }
        const isChecked = async () => {
            return await element.locator('input[type="checkbox"]').isChecked();
        }
        const deleteItem = async () => {
            await element.locator('button.delete-btn').click();
        }
        return {
            isChecked,
            change,
            delete: deleteItem,
            element
        };
    }

    return {
        todoList,
        todoInput,
        addTodoItem,
        getTodoItem
    }
}

test.describe('todo-app', () => {
    test('should display the default correctly', async ({ page }) => {
        const { todoList, todoInput, getTodoItem } = await todoApp(page);

        await expect(todoList).toBeVisible();
        await expect(todoInput).toBeVisible();
        await expect(getTodoItem('Learn pfusch').element).toBeVisible();
        await expect(getTodoItem('Learn JavaScript ').element).toBeVisible();
        await expect(getTodoItem('Learn html').element).toBeVisible();
    })

    test('it should add an item', async ({ page }) => {
        const { addTodoItem } = await todoApp(page);

        const todoItem = await addTodoItem('Learn CSS');
        await expect(todoItem.element).toBeVisible();
        expect(await todoItem.isChecked()).toBe(false);
    })

    test('it should mark an item completed', async ({ page }) => {
        const { getTodoItem } = await todoApp(page);

        const todoItem = getTodoItem('Learn html');
        expect(await todoItem.isChecked()).toBe(true);

        await todoItem.change();
        expect(await todoItem.isChecked()).toBe(false);

        await todoItem.change();
        expect(await todoItem.isChecked()).toBe(true);
    });

    test('it should delete an item', async ({ page }) => {
        const { getTodoItem } = await todoApp(page);
        const todoItem = getTodoItem('Learn pfusch');
        await todoItem.delete();

        await expect(todoItem.element).not.toBeVisible();
    });

    test("it should work with keyboard", async ({ page }) => {
        const { todoInput } = await todoApp(page);
        // Use the main input for adding todos
        await todoInput.focus();
        await todoInput.fill('Learn CSS');
        await todoInput.press('Enter');
        const todoItem = page.locator('todo-item').filter({ hasText: 'Learn CSS' }).first();
        await expect(todoItem).toBeVisible();

        const todoCheckbox = todoItem.locator('input[type="checkbox"]').first();
        await todoCheckbox.focus();
        await todoCheckbox.press('Space');
        await expect(todoCheckbox).toBeChecked();

        const deleteButton = todoItem.locator('button.delete-btn').first();
        await deleteButton.focus();
        await deleteButton.press('Enter');
        await expect(todoItem).not.toBeVisible();
    });

});