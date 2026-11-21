const { test, expect } = require('@playwright/test');

const PAGE = 'http://localhost:3030/examples/light.html';

const open = async (page) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => { throw err; });
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('chat-turn .text').first()).toBeVisible();
};

test.describe('light-DOM components ({ shadow: false })', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('a turn renders into itself, inside the thread shadow tree, styled by the thread', async ({ page }) => {
        const turn = page.locator('chat-turn').first();
        expect(await turn.evaluate(node => node.shadowRoot)).toBeNull();
        expect(await turn.evaluate(node => node.getRootNode() === document.querySelector('chat-thread').shadowRoot)).toBe(true);
        await expect(page.locator('chat-turn .text').first()).toHaveCSS('color', 'rgb(130, 40, 200)');
        await expect(page.locator('chat-turn .turn').first()).toHaveCSS('border-left-color', 'rgb(22, 163, 74)');
    });

    test('a card slotted into the thread shows inside its turn', async ({ page }) => {
        const card = page.locator('chat-thread > .card');
        await expect(card).toBeVisible();
        const slotted = await card.evaluate(node => node.assignedSlot && node.assignedSlot.closest('chat-turn')?.getAttribute('n'));
        expect(slotted).toBe('2');
        await expect(card).toHaveCSS('margin-top', '4px');
    });

    test('a turn rerenders on its own, without the thread', async ({ page }) => {
        const threadBefore = await page.evaluate(() => window.__threadRenders);
        const otherBefore = await page.evaluate(() => window.__turnRenders[1]);
        await page.locator('chat-turn[n="3"] .like').click();
        await expect(page.locator('chat-turn[n="3"] .like')).toHaveText('Like (1)');
        expect(await page.evaluate(() => window.__threadRenders)).toBe(threadBefore);
        expect(await page.evaluate(() => window.__turnRenders[1])).toBe(otherBefore);
    });

    test('the thread rerendering keeps every turn and what it drew', async ({ page }) => {
        await page.locator('chat-turn[n="1"] .like').click();
        const marked = await page.locator('chat-turn[n="1"] .text').evaluate(node => { node.dataset.mark = 'kept'; return true; });
        expect(marked).toBe(true);
        const turnRendersBefore = await page.evaluate(() => window.__turnRenders[1]);
        await page.locator('chat-thread .rename').click();
        await expect(page.locator('chat-thread .title')).toHaveText('Thread!');
        await expect(page.locator('chat-turn[n="1"] .text')).toHaveAttribute('data-mark', 'kept');
        await expect(page.locator('chat-turn[n="1"] .like')).toHaveText('Like (1)');
        expect(await page.evaluate(() => window.__turnRenders[1])).toBe(turnRendersBefore);
        await page.locator('chat-thread .add').click();
        await expect(page.locator('chat-turn')).toHaveCount(4);
        await expect(page.locator('chat-turn[n="1"] .text')).toHaveAttribute('data-mark', 'kept');
    });
});
