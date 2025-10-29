const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.goto('http://localhost:3030');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
});

test.describe('Index Page Documentation', () => {
    test('should display hero section with key stats', async ({ page }) => {
        // Check hero title
        const hero = page.locator('.hero');
        await expect(hero).toBeVisible();
        await expect(hero.locator('h1')).toContainText('Pfusch');
        await expect(hero.locator('.tagline')).toContainText('Rapid Prototyping');
        
        // Check stats
        const stats = hero.locator('.stat');
        await expect(stats).toHaveCount(3);
        
        // Verify key numbers
        await expect(page.locator('.stat-value').first()).toContainText('336');
        await expect(page.getByText('3.0K')).toBeVisible();
        await expect(page.getByText('0', { exact: true }).first()).toBeVisible();
    });
    
    test('should display feature cards', async ({ page }) => {
        const features = page.locator('.feature-card');
        await expect(features).toHaveCount(4);
        
        // Check feature titles - use more specific selectors to avoid duplicates
        await expect(page.locator('.feature-card').getByText('Instant Setup')).toBeVisible();
        await expect(page.locator('.feature-card').getByText('Design System Ready')).toBeVisible();
        await expect(page.locator('.feature-card').getByText('Progressive Enhancement')).toBeVisible();
        await expect(page.locator('.feature-card').getByText('Zero Dependencies')).toBeVisible();
    });
    
    test('should display all 5 interactive examples', async ({ page }) => {
        const examples = page.locator('.example-card');
        await expect(examples).toHaveCount(5);
        
        // Check example titles - use example-title class to avoid duplicates
        await expect(page.locator('.example-title').getByText('Simple Counter')).toBeVisible();
        await expect(page.locator('.example-title').getByText('Event-Driven Architecture')).toBeVisible();
        await expect(page.locator('.example-title').getByText('Form Validation')).toBeVisible();
        await expect(page.locator('.example-title').getByText('Todo Application')).toBeVisible();
        await expect(page.locator('.example-title').getByText('Progressive Enhancement')).toBeVisible();
    });
    
    test('should have working counter example', async ({ page }) => {
        const counter = page.locator('my-counter').first();
        await expect(counter).toBeVisible();
        
        // Check initial value
        await expect(counter.locator('.count-display')).toContainText('Count: 10');
        
        // Click increment
        await counter.locator('#increment-btn').click();
        await expect(counter.locator('.count-display')).toContainText('Count: 11');
        
        // Click decrement
        await counter.locator('#decrement-btn').click();
        await expect(counter.locator('.count-display')).toContainText('Count: 10');
        
        // Click reset
        await counter.locator('#reset-btn').click();
        await expect(counter.locator('.count-display')).toContainText('Count: 0');
    });
    
    test('should have working event-driven example', async ({ page }) => {
        const eventCounter = page.locator('event-counter').first();
        const counterDisplay = page.locator('counter-display').first();
        
        await expect(eventCounter).toBeVisible();
        await expect(counterDisplay).toBeVisible();
        
        // Check initial value
        await expect(counterDisplay.locator('.count-value')).toContainText('Count: 0');
        
        // Click increment on event-counter
        await eventCounter.locator('#event-increment-btn').click();
        await expect(counterDisplay.locator('.count-value')).toContainText('Count: 1');
        
        // Click decrement
        await eventCounter.locator('#event-decrement-btn').click();
        await expect(counterDisplay.locator('.count-value')).toContainText('Count: 0');
    });
    
    test('should have working form validation example', async ({ page }) => {
        const form = page.locator('#test-form').first();
        await expect(form).toBeVisible();
        
        const usernameInput = page.locator('my-input[name="username"]').first();
        const emailInput = page.locator('my-input[name="email"]').first();
        const submitButton = page.locator('#submit-btn').first();
        
        // Note: Submit button is not wrapped by form-validator in the new index,
        // so it won't be disabled initially. Just verify it's visible.
        await expect(submitButton).toBeVisible();
        
        // Fill in valid data
        await usernameInput.locator('input').fill('testuser');
        await emailInput.locator('input').fill('test@example.com');
        
        // Wait for validation
        await page.waitForTimeout(500);
        
        // Submit button should be enabled with valid data
        await expect(submitButton).toBeEnabled();
    });
    
    test('should have working todo app example', async ({ page }) => {
        const todoApp = page.locator('todo-app').first();
        await expect(todoApp).toBeVisible();
        
        const todoInput = todoApp.locator('.todo-input').first();
        await expect(todoInput).toBeVisible();
        
        // Check default todos
        const defaultTodos = todoApp.locator('todo-item');
        await expect(defaultTodos).toHaveCount(3);
        
        // Add a new todo
        await todoInput.fill('Test new todo');
        await todoInput.press('Enter');
        
        // Should have 4 todos now
        await expect(todoApp.locator('todo-item')).toHaveCount(4);
        await expect(todoApp.getByText('Test new todo')).toBeVisible();
    });
    
    test('should have working progressive enhancement example', async ({ page }) => {
        const enhancedTable = page.locator('enhanced-table').first();
        await expect(enhancedTable).toBeVisible();
        
        // Wait for table to initialize and replace slot content
        await page.waitForTimeout(1000);
        
        // Check for sort buttons (should be 3 columns: name, status, priority)
        const sortNameBtn = enhancedTable.locator('#sort-name-btn');
        const sortStatusBtn = enhancedTable.locator('#sort-status-btn');
        const sortPriorityBtn = enhancedTable.locator('#sort-priority-btn');
        const clearSortBtn = enhancedTable.locator('#clear-sort-btn');
        
        await expect(sortNameBtn).toBeVisible();
        await expect(sortStatusBtn).toBeVisible();
        await expect(sortPriorityBtn).toBeVisible();
        await expect(clearSortBtn).toBeVisible();
        
        // Get the shadow DOM tbody (not the light DOM one)
        const tbody = enhancedTable.locator('tbody').last();
        
        // Get initial order (should be: Zebra, Apple, Mango, Banana)
        let rows = await tbody.locator('tr td:first-child').allTextContents();
        expect(rows[0]).toContain('Zebra');
        expect(rows[1]).toContain('Apple');
        expect(rows[2]).toContain('Mango');
        expect(rows[3]).toContain('Banana');
        
        // Test Sort by Name
        await sortNameBtn.click();
        await page.waitForTimeout(300);
        
        rows = await tbody.locator('tr td:first-child').allTextContents();
        expect(rows[0]).toContain('Apple');
        expect(rows[1]).toContain('Banana');
        expect(rows[2]).toContain('Mango');
        expect(rows[3]).toContain('Zebra');
        
        // Test Sort by Priority
        await sortPriorityBtn.click();
        await page.waitForTimeout(300);
        
        const priorityCells = await tbody.locator('tr td:nth-child(3)').allTextContents();
        expect(priorityCells[0]).toBe('High');
        expect(priorityCells[1]).toBe('High');
        expect(priorityCells[2]).toBe('Low');
        expect(priorityCells[3]).toBe('Medium');
        
        // Test Clear Sort (should restore original order)
        await clearSortBtn.click();
        await page.waitForTimeout(300);
        
        rows = await tbody.locator('tr td:first-child').allTextContents();
        expect(rows[0]).toContain('Zebra');
        expect(rows[1]).toContain('Apple');
        expect(rows[2]).toContain('Mango');
        expect(rows[3]).toContain('Banana');
    });
    
    test('should display CTA section with links', async ({ page }) => {
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Check for GitHub link
        const githubLink = page.getByRole('link', { name: 'View on GitHub' });
        await expect(githubLink).toBeVisible();
        await expect(githubLink).toHaveAttribute('href', 'https://github.com/MatthiasKainer/pfusch');
        
        // Check for docs link
        const docsLink = page.getByRole('link', { name: 'Read the Docs' });
        await expect(docsLink).toBeVisible();
        await expect(docsLink).toHaveAttribute('href', './Readme.md');
    });
    
    test('should have Pure CSS classes applied', async ({ page }) => {
        // Check that Pure CSS is loaded
        const pureForm = page.locator('.pure-form').first();
        await expect(pureForm).toBeVisible();
        
        // Check Pure CSS buttons
        const pureButtons = page.locator('.pure-button');
        await expect(pureButtons.first()).toBeVisible();
        
        // Check Pure CSS table in shadow DOM (there are 2: one in slot, one in shadow)
        // Wait for enhanced-table to finish loading
        await page.waitForTimeout(1000);
        const enhancedTable = page.locator('enhanced-table').first();
        // Get all tables and check that at least one is visible
        const shadowTables = enhancedTable.locator('table.pure-table');
        await expect(shadowTables.last()).toBeVisible();
    });
});
