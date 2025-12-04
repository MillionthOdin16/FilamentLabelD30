
import { test, expect } from '@playwright/test';
import { MOCK_BLUETOOTH_DEVICE_NAME, mockBluetooth } from '../fixtures/mock-bluetooth';

test.describe('Core Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Initialize mock bluetooth environment
    await mockBluetooth(page);

    // Navigate to the app
    await page.goto('/');
    // Ensure the page is loaded
    await expect(page.locator('text=Filament ID')).toBeVisible();
  });

  test('Manual Entry -> Edit -> Print', async ({ page }) => {
    // 1. Enter Manual Entry Mode
    await page.getByText('Manual Entry').click();

    // Should now be in Editor mode
    await expect(page.getByText('Brand')).toBeVisible();

    // 2. Edit Data
    // Use robust CSS sibling selectors
    await page.locator('label:has-text("Brand") + input').fill('Playwright Brand');
    await page.locator('label:has-text("Material") + input').fill('PLA-TEST');

    // Color Name is inside a wrapper div
    await page.locator('label:has-text("Color Name") + div input[type="text"]').fill('Test Blue');

    // 3. Connect & Print (Mocked)
    // The button text is "CONNECT & PRINT" initially.
    // Clicking it triggers the print flow immediately.
    await page.getByText('CONNECT & PRINT').click();

    // 4. Verify Success
    // The app transitions through 'connecting', 'printing' to 'success'.
    // We wait for the success message.
    // Use case insensitive matching or exact string from App.tsx ('Print complete!')
    await expect(page.getByText('Print complete!', { exact: false })).toBeVisible({ timeout: 15000 });
  });

  test('Batch Queue Addition', async ({ page }) => {
    await page.getByText('Manual Entry').click();

    // Fill required data
    await page.locator('label:has-text("Brand") + input').fill('Batch Brand');
    await page.locator('label:has-text("Material") + input').fill('PETG-BATCH');

    // Add to Batch
    // The button says "Add to Batch" now (part of new 2-button layout)
    await page.getByText('Add to Batch', { exact: true }).click();

    // Verify "Added to Batch History" toast
    await expect(page.getByText('Added to Batch History')).toBeVisible();

    // Verify count in Batch List
    // Go to Batch List
    await page.getByText('Batch', { exact: true }).click(); // The tab is named "Batch"

    // Wait for the list to appear
    await expect(page.getByText('Batch Brand')).toBeVisible();
    await expect(page.getByText('PETG-BATCH')).toBeVisible();
  });
});
