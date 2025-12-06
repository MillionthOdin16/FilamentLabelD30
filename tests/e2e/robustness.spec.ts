import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';

test.describe('Robustness & Stress', () => {
  test.beforeEach(async ({ page }) => {
    // Enable debug logging
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

    await mockBluetooth(page);
    await page.goto('/');
  });

  test('Data Persistence: History survives reload', async ({ page }) => {
    // 1. Add item to history (Batch add)
    await page.getByText('Manual Entry').click();
    // Fill distinct data to verify persistence
    await page.locator('label:has-text("Brand") + input').fill('PersistenceCheck');

    await page.getByRole('button', { name: 'Add to Batch' }).click();

    // Verify toast
    await expect(page.getByText('Added to Batch')).toBeVisible();

    // 2. Reload
    await page.reload();

    // 3. Verify item is still in Batch list
    // Wait for the app to be stable
    await expect(page.getByText('Filament ID')).toBeVisible();

    // On reload, we are back at HOME. We need to enter the app to see tabs.
    // Click "Manual Entry" to go to Editor, then switch tabs.
    await page.getByText('Manual Entry').click();
    await expect(page.getByText('Customize')).toBeVisible();

    // Now go to Batch
    await page.getByTestId('tab-batch').click({ force: true });

    // Search for it to ensure it's loaded
    await page.getByPlaceholder('Search brand, material, or color...').fill('PersistenceCheck');
    await expect(page.getByText('PersistenceCheck')).toBeVisible();
  });

  test('Input Stress: Editable Sliders handle invalid input', async ({ page }) => {
    await page.getByText('Manual Entry').click();

    // Find nozzle input
    const input = page.locator('label:has-text("Nozzle Min") + div input');

    // 1. Enter negative
    await input.fill('-100');
    await input.blur();

    // Should clamp to min (180)
    const val = await input.inputValue();
    expect(parseInt(val)).toBe(180);

    // 2. Enter huge number
    await input.fill('9999');
    await input.blur();

    // Should clamp to max (320)
    const val2 = await input.inputValue();
    expect(parseInt(val2)).toBe(320);
  });

  test('UI Stress: Rapid Navigation', async ({ page }) => {
      // Enter app first
      await page.getByText('Manual Entry').click();
      await expect(page.getByText('Customize')).toBeVisible();

      // Rapidly switch tabs to check for crashes/freezes
      for (let i = 0; i < 3; i++) {
          await page.getByTestId('tab-editor').click({ force: true });
          // Wait for view to settle slightly
          await expect(page.locator('text=Customize')).toBeVisible();

          await page.getByTestId('tab-batch').click({ force: true });
          await expect(page.getByPlaceholder('Search brand, material, or color...')).toBeVisible();

          await page.getByTestId('tab-templates').click({ force: true });
          await page.getByTestId('tab-analytics').click({ force: true });
      }

      // Ensure we are still alive and on Analytics
      await expect(page.getByText('Total Labels')).toBeVisible();
  });
});
