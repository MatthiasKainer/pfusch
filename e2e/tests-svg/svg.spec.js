const { test, expect } = require('@playwright/test');

const PAGE = 'http://localhost:3030/examples/svg.html';

const STROKES = {
    plan: 'rgb(130, 130, 130)',
    run: 'rgb(217, 119, 6)',
    done: 'rgb(22, 163, 74)',
    error: 'rgb(220, 38, 38)'
};

const open = async (page) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => { throw err; });
    await page.goto(PAGE);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('svg-ring #next')).toBeVisible();
};

test.describe('svg descriptors render in the SVG namespace', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('the ring is real, painted SVG', async ({ page }) => {
        const svg = page.locator('svg-ring #ring');
        const ring = page.locator('svg-ring circle.ring');

        await expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
        expect(await svg.evaluate(node => node instanceof SVGSVGElement)).toBe(true);
        expect(await ring.evaluate(node => node instanceof SVGElement)).toBe(true);
        expect(await ring.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg');

        // A node in the wrong namespace has no box and no geometry.
        // getBBox() returns an SVGRect, which does not survive structured cloning — read the numbers.
        const box = await ring.evaluate(node => ({ width: node.getBBox().width, height: node.getBBox().height }));
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
    });

    test('the stroke follows the class on <svg> and the node is never rebuilt', async ({ page }) => {
        const ring = page.locator('svg-ring circle.ring');
        await expect(ring).toHaveCSS('stroke', STROKES.plan);
        expect(await page.evaluate(() => window.__ringMounts)).toBe(1);

        for (const tone of ['run', 'done', 'error', 'plan']) {
            await page.locator('svg-ring #next').click();
            await expect(page.locator('svg-ring #tone')).toHaveText(tone);
            await expect(page.locator('svg-ring #ring')).toHaveClass(`tone-${tone}`);
            await expect(ring).toHaveCSS('stroke', STROKES[tone]);
        }

        // Same element object throughout: the CSS transition was never cancelled by a rebuild.
        expect(await page.evaluate(() => window.__ringMounts)).toBe(1);
        expect(await page.locator('svg-ring #ring').evaluate(node => node.__instance)).toBe(1);
    });

    test('the dash offset is patched in place', async ({ page }) => {
        const ring = page.locator('svg-ring circle.ring');
        await expect(ring).toHaveAttribute('stroke-dashoffset', '43');
        await expect(ring).toHaveAttribute('pathLength', '63');

        await page.locator('svg-ring #next').click();
        await expect(ring).toHaveAttribute('stroke-dashoffset', '18');
        await expect(ring).toHaveAttribute('pathLength', '63');
    });
});

test.describe('foreignObject returns to the HTML namespace', () => {
    test.beforeEach(async ({ page }) => { await open(page); });

    test('its children are HTML elements that lay out', async ({ page }) => {
        const slot = page.locator('svg-label #slot');
        const caption = page.locator('svg-label #caption');

        expect(await slot.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg');
        expect(await caption.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/1999/xhtml');
        expect(await caption.evaluate(node => node instanceof HTMLParagraphElement)).toBe(true);
        expect(await caption.evaluate(node => node.offsetWidth)).toBeGreaterThan(0);
    });

    test('a state change patches the HTML child without rebuilding the SVG', async ({ page }) => {
        await page.locator('svg-label #card').evaluate(node => { node.__stamp = 'kept'; });

        await page.locator('svg-label #shout').click();
        await expect(page.locator('svg-label #caption')).toHaveText('HTML INSIDE SVG, WRAPPED BY THE BROWSER.');

        expect(await page.locator('svg-label #card').evaluate(node => node.__stamp)).toBe('kept');
    });
});
