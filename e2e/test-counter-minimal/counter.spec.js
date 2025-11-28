const { test, expect } = require('@playwright/test');

test('live-counter component works correctly', async ({ page }) => {
  // Listen to browser console
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // Navigate to the test page
  await page.goto('http://localhost:3030/e2e/test-counter.html');
  

  // Wait for the live-counter component to be defined and rendered
  await page.waitForFunction(() => {
    const liveCounter = document.querySelector('live-counter');
    return liveCounter && liveCounter.shadowRoot && liveCounter.isConnected;
  }, { timeout: 5000 });

  console.log('=== Starting live-counter component test ===');

  // Find the live-counter component
  const liveCounter = page.locator('live-counter');
  await expect(liveCounter).toBeVisible();

  // Verify initial count
  const countText = await liveCounter.locator('p').textContent();
  console.log('Initial count text:', countText);
  expect(countText).toBe('Counting: 0');

  // Find and click the Increment button
  const incrementButton = liveCounter.locator('button');
  await expect(incrementButton).toBeVisible();

  console.log('Clicking Increment button...');
  await incrementButton.click();

  // Verify count is incremented
  const updatedCountText = await liveCounter.locator('p').textContent();
  console.log('Updated count text:', updatedCountText);
  expect(updatedCountText).toBe('Counting: 1');

  console.log('=== live-counter component test completed successfully ===');
});
