
import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';
import fs from 'fs';
import path from 'path';

test.describe('Real API Integration Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Only mock bluetooth, allow network for Real API
    await mockBluetooth(page);
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    await page.goto('/');
  });

  test('Full Workflow: Upload -> Analyze -> Verify Data -> Batch Preview', async ({ page }) => {
    // 1. Upload the generated image
    const imagePath = path.join(process.cwd(), 'tests/fixtures/sample_spool.png');
    if (!fs.existsSync(imagePath)) {
        test.skip(true, 'Sample image not found');
    }

    console.log("Uploading image...");
    await page.setInputFiles('input[type="file"]', {
        name: 'sample_spool.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(imagePath)
    });

    // 2. Wait for Analysis to complete and "Customize" screen to appear
    console.log("Waiting for analysis...");
    await expect(page.getByText('Customize')).toBeVisible({ timeout: 60000 });

    // Debugging: Log Source and Notes
    const sourceElement = page.locator('a[href] span, div.flex.items-center.gap-1 span').first();
    if (await sourceElement.isVisible()) {
        console.log(`Detected Source: "${await sourceElement.textContent()}"`);
    }

    // 3. Verify Data Population (Inputs)
    console.log("Verifying input fields...");

    // Brand
    const brandInput = page.locator('label:has-text("Brand") + input');
    await expect(brandInput).toBeVisible();
    const brandValue = await brandInput.inputValue();
    console.log(`Detected Brand: "${brandValue}"`);

    if (brandValue === 'GENERIC') {
        // Log notes to see error
        const notesInput = page.locator('textarea');
        console.log(`Notes: "${await notesInput.inputValue()}"`);
    }

    expect(brandValue.toUpperCase()).toContain('OVERTURE');

    // Ensure default "GENERIC" is NOT present in the value
    expect(brandValue.toUpperCase()).not.toBe('GENERIC');

    // Material
    const materialInput = page.locator('label:has-text("Material") + input');
    const materialValue = await materialInput.inputValue();
    console.log(`Detected Material: "${materialValue}"`);
    expect(materialValue.toUpperCase()).toContain('PLA');

    // Temperatures
    const nozzleMin = await page.locator('label:has-text("Nozzle Min") + div input').inputValue();
    console.log(`Detected Nozzle Min: ${nozzleMin}`);
    expect(nozzleMin).toBe('200');

    const nozzleMax = await page.locator('label:has-text("Nozzle Max") + div input').inputValue();
    console.log(`Detected Nozzle Max: ${nozzleMax}`);
    expect(nozzleMax).toBe('220');

    // 4. Verify Label Preview (Indirectly via Batch/Thumbnail)
    console.log("Adding to Batch...");
    await page.getByRole('button', { name: 'Add to Batch' }).click();

    console.log("Navigating to Batch tab...");
    await page.getByTestId('tab-batch').click();

    // 5. Verify Batch Item
    console.log("Verifying batch item...");
    await expect(page.getByText('OVERTURE').first()).toBeVisible();
    await expect(page.getByText('PLA', { exact: false }).first()).toBeVisible();

    console.log("Full workflow verification complete.");
  });
});
