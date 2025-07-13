const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3030');
    // wait until network is idle
    await page.waitForLoadState('networkidle');
    // let scripts execute
    await page.waitForTimeout(1000);
});

const todoApp = async (page) => {
    const todoList = page.locator('todo-list').first();
    const todoAdd = page.locator('todo-add').first();
    const todoInput = todoAdd.locator('input').first();
        
    const addTodoItem = async (text) => {
        await todoInput.fill(text);
        await todoInput.press('Enter');
        return getTodoItem(text);
    }

    const getTodoItem = (text) => {
        const element = page.locator(`todo-item[text="${text}"]`).first();
        
        const change = async () => {
            await element.locator("label").click();
        }
        const isChecked = async () => {
            return await element.locator("input").isChecked()
        }
        const deleteItem = async () => {
            await element.locator("button").click();
        }
        return {
            isChecked,
            change,
            delete: deleteItem,
            element
        };
    }


    const hasShownStatus = async (text) => {
        await expect(page.getByRole("status").first()).toContainText(text);
    }

    return {
        todoList,
        todoAdd,
        todoInput,
        addTodoItem,
        getTodoItem,
        hasShownStatus
    }
}

test.describe('todo-app', () => {
    test('should display the default correctly', async ({ page }) => {
        const { todoList, todoAdd, getTodoItem } = await todoApp(page);
        
        await expect(todoList).toBeVisible();
        await expect(todoAdd).toBeVisible();
        await expect(getTodoItem('Learn pfusch').element).toBeVisible();
        await expect(getTodoItem('Learn JavaScript ').element).toBeVisible();
        await expect(getTodoItem('Learn html').element).toBeVisible();
    })

    test('it should add an item', async ({ page }) => {
        const { addTodoItem, hasShownStatus } = await todoApp(page);

        const todoItem = await addTodoItem('Learn CSS');
        await expect(todoItem.element).toBeVisible();
        expect(await todoItem.isChecked(), false);
        await hasShownStatus('Added "Learn CSS" to your todo list');
    })

    test('it should mark an item completed', async ({ page }) => {
        const { getTodoItem, hasShownStatus } = await todoApp(page);

        const todoItem = getTodoItem('Learn html');
        expect(await todoItem.isChecked(), true);

        await todoItem.change();
        expect(await todoItem.isChecked(), false);
        await hasShownStatus('Marked "Learn html" as not completed');

        await todoItem.change();
        expect(await todoItem.isChecked(), true);
        await hasShownStatus('Marked "Learn html" as completed');
    });

    test('it should delete an item', async ({ page }) => {
        const { getTodoItem } = await todoApp(page);
        const todoItem = getTodoItem('Learn pfusch');
        await todoItem.delete();

        await expect(todoItem.element).not.toBeVisible();
    });

    test("it should work with keyboard", async ({ page }) => {
        // don't use the page object here, because we want to use the keyboard

        const todoAdd = page.locator('todo-add').first();
        const todoInput = todoAdd.locator('input').first();

        await todoInput.focus();
        await todoInput.fill('Learn CSS');
        await todoInput.press('Enter');
        await expect(page.locator('todo-item[text="Learn CSS"]').first()).toBeVisible();
        await expect(page.getByRole("status").first()).toContainText('Added "Learn CSS" to your todo list');

        const todoItem = page.locator('todo-item[text="Learn CSS"]').first();
        const todoCheckbox = todoItem.locator('li input').first();

        await todoCheckbox.press('Space');
        await expect(todoCheckbox).toBeChecked();
        await expect(page.getByRole("status").first()).toContainText('Marked "Learn CSS" as completed');


        const deleteButton = todoItem.locator('button').first();
        await deleteButton.focus();
        await deleteButton.press('Enter');
        await expect(page.locator('todo-item[text="Learn CSS"]').first()).not.toBeVisible();
        await expect(page.getByRole("status").first()).toContainText('Deleted "Learn CSS" from your todo list');
    });

    test("it should reset my changes when I click the reset button", async ({ page }) => {
        const { addTodoItem, getTodoItem } = await todoApp(page);
        const learnCss = await addTodoItem('Learn CSS');
        await expect(learnCss.element).toBeVisible();
        const learnPfusch = getTodoItem('Learn pfusch');
        const learnJavaScript = getTodoItem('Learn JavaScript ');
        const learnHtml = getTodoItem('Learn html');
        learnPfusch.change();
        learnJavaScript.delete();
        learnHtml.delete();

        const resetButton = page.locator('button:has-text("Reset everything")').first();
        await resetButton.click();

        await expect(learnCss.element).not.toBeVisible();
        await expect(learnPfusch.element).toBeVisible();
        expect(await learnPfusch.isChecked()).toBe(false);
        await expect(learnJavaScript.element).toBeVisible();

        expect(await learnJavaScript.isChecked()).toBe(true);
        await expect(learnHtml.element).toBeVisible();
        expect(await learnHtml.isChecked()).toBe(true);
    });
});