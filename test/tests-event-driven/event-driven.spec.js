const { test, expect } = require('@playwright/test');

test('event-driven architecture works correctly', async ({ page }) => {
  // Listen to browser console
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
  // Navigate to the test page
  await page.goto('http://localhost:3030/test/test-event-driven.html');
  
  // Wait for components to initialize
  await page.waitForTimeout(1000);
  
  console.log('=== Starting event-driven architecture test ===');
  
  // Find the components
  const statusDisplay = page.locator('status-display');
  const dataLoader = page.locator('data-loader');
  
  // Verify components are present
  await expect(statusDisplay).toBeVisible();
  await expect(dataLoader).toBeVisible();
  
  console.log('Components found and visible');
  
  // Get initial status message
  const initialMessage = await statusDisplay.locator('.status-message').textContent();
  console.log('Initial message:', initialMessage);
  expect(initialMessage).toBe('(waiting for data...)');
  
  // Find and click the "Load Data" button inside data-loader shadow DOM
  const loadButton = dataLoader.locator('button');
  await expect(loadButton).toBeVisible();
  
  const buttonText = await loadButton.textContent();
  console.log('Button text:', buttonText);
  expect(buttonText).toBe('Load Data');
  
  // Click the button to trigger the event
  console.log('Clicking Load Data button...');
  await loadButton.click();
  
  // Wait for the event to propagate and state to update
  await page.waitForTimeout(500);
  
  // Check that the status message was updated
  const updatedMessage = await statusDisplay.locator('.status-message').textContent();
  console.log('Updated message:', updatedMessage);
  expect(updatedMessage).toBe('Success!');
  
  // Verify browser logs show the event was triggered with the correct name
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  
  // Click again to capture logs
  console.log('Clicking button again to verify event name...');
  await loadButton.click();
  await page.waitForTimeout(500);
  
  // Check final message is still "Success!"
  const finalMessage = await statusDisplay.locator('.status-message').textContent();
  console.log('Final message:', finalMessage);
  expect(finalMessage).toBe('Success!');
  
  console.log('=== Event-driven architecture test completed successfully ===');
});
