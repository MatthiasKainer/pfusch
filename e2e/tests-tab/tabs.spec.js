const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3030');
    // wait until network is idle
    await page.waitForLoadState('networkidle');
    // let scripts execute
    await page.waitForTimeout(1000);
});

const tabs = async (page) => {
    const tabs = page.locator('tablist').first();
    
    const tab = (text) => tabs.locator(`tab`).getByText(text).first();
}

test.describe('tabs', () => {
    test('should display the default correctly', async ({ page }) => {
        page.getByText
    });
})