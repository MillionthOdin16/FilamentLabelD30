
import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';

test.describe('UI Audit Tour', () => {
  test.beforeEach(async ({ page }) => {
    await mockBluetooth(page);
    await page.goto('/');
  });

  test('Navigation and Interaction Audit', async ({ page }) => {
    // 1. Home Dashboard
    await expect(page.getByText('Filament ID')).toBeVisible();
    await expect(page.getByText('Scan Label')).toBeVisible();

    // 2. Manual Entry -> Editor
    // Updated selector to match "Manual" text instead of "Manual Entry"
    await page.getByText('Manual', { exact: true }).click();
    await expect(page.getByText('Customize')).toBeVisible();

    // 3. Editor Interactions
    // Check toggle buttons
    // Use specific locator to avoid collision with "Open Date" label
    await page.getByRole('button', { name: 'Date' }).click();

    // Check if Date input appeared
    await expect(page.getByText('Open Date')).toBeVisible();

    // Check Ruler toggle
    await page.getByRole('button', { name: 'Ruler' }).click();

    // 4. Smart Slider Interaction
    await expect(page.getByText('Nozzle Min')).toBeVisible();
    // Verify manual input works
    const nozzleInput = page.locator('label:has-text("Nozzle Min") + div input');
    await expect(nozzleInput).toBeVisible();
    await nozzleInput.fill('215');
    await nozzleInput.blur();

    // 5. Navigate to Batch
    // Use precise regex to match "Batch" tab but not "Add to Batch"
    await page.getByRole('button', { name: /^Batch$/ }).click();
    // Check empty state or search bar
    await expect(page.getByPlaceholder('Search brand, material, or color...')).toBeVisible();

    // 6. Navigate to Templates
    await page.getByRole('button', { name: /^Templates$/ }).click();
    await expect(page.getByText('Template Gallery')).toBeVisible();
    // Filter templates
    await page.getByRole('button', { name: 'Minimal' }).click();

    // 7. Navigate to Analytics
    await page.getByRole('button', { name: /^Analytics$/ }).click();
    await expect(page.getByText('Total Labels')).toBeVisible();
    // Check Export button
    await expect(page.getByTitle('Export CSV')).toBeVisible();

    // 8. Return to Home
    await page.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') }).click(); // Reset/Home button
    await expect(page.getByText('Scan Label')).toBeVisible();
  });
});
