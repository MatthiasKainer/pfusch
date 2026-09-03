const { test, expect } = require('@playwright/test');

const PAGE = 'http://localhost:3030/examples/animation.html';

const open = async (page) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => { throw err; });
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('step-row #next')).toBeVisible();
};

test.describe('keep + mount/unmount around an imperative engine', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('the engine mounts once and keeps its own DOM across attribute changes', async ({ page }) => {
        const svg = page.locator('step-state-icon svg');
        await expect(svg).toHaveAttribute('data-state', 'plan');
        await expect(svg).toHaveAttribute('data-instance', '1');
        expect(await page.evaluate(() => window.__mounts)).toBe(1);

        for (const expected of ['run', 'done', 'error', 'plan']) {
            await page.locator('step-row #next').click();
            await expect(page.locator('step-row #label')).toHaveText(expected);
            await expect(svg).toHaveAttribute('data-state', expected);
        }

        // A rebuilt node would mount again and lose the instance stamp.
        expect(await page.evaluate(() => window.__mounts)).toBe(1);
        expect(await page.evaluate(() => window.__unmounts)).toBeUndefined();
        await expect(svg).toHaveAttribute('data-instance', '1');
        await expect(page.locator('step-state-icon [keep]')).toHaveAttribute('aria-label', 'step plan');
    });
});

test.describe('exit on a list', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('a leaving row holds its position until the animation finishes', async ({ page }) => {
        const items = page.locator('todo-list #list li');
        await expect(items).toHaveCount(3);

        await page.locator('todo-list li#todo-2 .remove').click();

        // The descriptor is gone immediately, the node is not.
        await expect(page.locator('todo-list #count')).toHaveText('2 open');
        const leaving = page.locator('todo-list li#todo-2');
        await expect(leaving).toHaveAttribute('data-pfusch', 'exit');
        await expect(leaving).toHaveClass(/leaving/);
        await expect(items).toHaveCount(3);
        expect(await items.nth(1).getAttribute('id')).toBe('todo-2');

        await expect(items).toHaveCount(2, { timeout: 3000 });
        await expect(page.locator('todo-list li#todo-2')).toHaveCount(0);
        expect(await items.allTextContents()).toEqual(['Design✕', 'Ship✕']);
    });

    test('an added row is patched in without disturbing its siblings', async ({ page }) => {
        const items = page.locator('todo-list #list li');
        await page.locator('todo-list #add').click();
        await expect(items).toHaveCount(4);
        await expect(page.locator('todo-list #count')).toHaveText('4 open');
        await expect(page.locator('todo-list li#todo-4')).toBeVisible();
    });
});

test.describe('reduced motion', () => {
    test('a leaving row is removed immediately when motion is reduced', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page);

        const items = page.locator('todo-list #list li');
        await expect(items).toHaveCount(3);

        await page.locator('todo-list li#todo-2 .remove').click();
        await expect(items).toHaveCount(2);
        await expect(page.locator('todo-list li#todo-2')).toHaveCount(0);
    });

    test('the panel exit handler starts nothing when motion is reduced', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page);

        await page.locator('exit-panel #toggle').click();
        await expect(page.locator('exit-panel #panel')).toHaveCount(0);
    });
});

test.describe('a function exit', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('the panel is awaited by the differ and then removed', async ({ page }) => {
        const panel = page.locator('exit-panel #panel');
        await expect(panel).toBeVisible();

        await page.locator('exit-panel #toggle').click();
        await expect(panel).toHaveAttribute('data-pfusch', 'exit');
        expect(await panel.evaluate(node => node.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);

        await expect(panel).toHaveCount(0, { timeout: 3000 });
        await expect(page.locator('exit-panel #toggle')).toHaveText('Show panel');
    });
});

test.describe('reordering', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('rotating the list moves the existing nodes', async ({ page }) => {
        const cards = page.locator('reorder-list #order li');
        await expect(cards).toHaveText(['alpha', 'beta', 'gamma', 'delta']);

        await page.locator('reorder-list #shuffle').click();
        await expect(cards).toHaveText(['beta', 'gamma', 'delta', 'alpha']);

        await page.locator('reorder-list #shuffle').click();
        await expect(cards).toHaveText(['gamma', 'delta', 'alpha', 'beta']);
    });
});
