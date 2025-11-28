const { test, expect } = require('@playwright/test');

test.describe('Spread Operator Bug', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        await page.goto('http://localhost:3030/e2e/test-spread-bug.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
    });

    test('BROKEN: spread buttons first, clear button last - demonstrates the bug', async ({ page }) => {
        console.log('=== Testing BROKEN configuration ===');
        
        const brokenResult = page.locator('#broken-result');
        
        // Access buttons inside shadow DOM using Playwright's shadow DOM piercing
        const brokenExample = page.locator('broken-example');
        const btnA = brokenExample.locator('button#broken-btn-a');
        const btnB = brokenExample.locator('button#broken-btn-b');
        const btnC = brokenExample.locator('button#broken-btn-c');
        const clearBtn = brokenExample.locator('button#broken-clear-btn');

        // Verify buttons exist
        await expect(btnA).toBeVisible();
        await expect(btnB).toBeVisible();
        await expect(btnC).toBeVisible();
        await expect(clearBtn).toBeVisible();

        // Click Button A - BUG: this will trigger the clear button's handler
        await btnA.click();
        await page.waitForTimeout(100);
        
        // This assertion will FAIL, showing the bug
        // Expected: "Clicked: A"
        // Actual: "Clicked: CLEAR" (wrong handler!)
        const resultText = await brokenResult.textContent();
        console.log('Button A result:', resultText);
        
        // BUG: Clicking Button A incorrectly triggers Clear handler
        // expect(resultText).toBe('Clicked: CLEAR');

        // Fixed! Button A now correctly triggers its own handler
        expect(resultText).toBe('Clicked: A');
    });

    test('WORKING: clear button first, spread buttons last - workaround', async ({ page }) => {
        console.log('=== Testing WORKING configuration ===');
        
        const workingResult = page.locator('#working-result');
        
        // Access buttons inside shadow DOM using Playwright's shadow DOM piercing
        const workingExample = page.locator('working-example');
        const btnA = workingExample.locator('button#working-btn-a');
        const btnB = workingExample.locator('button#working-btn-b');
        const btnC = workingExample.locator('button#working-btn-c');
        const clearBtn = workingExample.locator('button#working-clear-btn');

        // Verify buttons exist
        await expect(btnA).toBeVisible();
        await expect(btnB).toBeVisible();
        await expect(btnC).toBeVisible();
        await expect(clearBtn).toBeVisible();

        // Click Button A - should work correctly
        await btnA.click();
        await page.waitForTimeout(100);
        await expect(workingResult).toHaveText('Clicked: A');

        // Click Button B
        await btnB.click();
        await page.waitForTimeout(100);
        await expect(workingResult).toHaveText('Clicked: B');

        // Click Button C
        await btnC.click();
        await page.waitForTimeout(100);
        await expect(workingResult).toHaveText('Clicked: C');

        // Click Clear
        await clearBtn.click();
        await page.waitForTimeout(100);
        await expect(workingResult).toHaveText('Clicked: CLEAR');
    });
});
