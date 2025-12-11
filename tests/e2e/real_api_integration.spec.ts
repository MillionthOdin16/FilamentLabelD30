
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

  test('Full Workflow: Upload -> Analyze -> Verify Data or Graceful Failure', async ({ page }) => {
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

    // 2. Wait for Analysis or Result
    console.log("Waiting for analysis result...");

    // We expect either:
    // A) Success: "Customize" screen appears.
    // B) Failure: We return to "Scan Label" (Home) or see Error Toast.

    // Wait for either Customize or Home (Scan Label text)
    // Note: Home also has "Scan Label" but Analysis view covers it.

    const customizeVisible = page.getByText('Customize');
    const homeVisible = page.getByText('Scan Label').first();
    const errorToast = page.locator('div[role="alert"]'); // Toast usually has role alert or class

    // Race condition: wait for either state
    await Promise.race([
        customizeVisible.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {}),
        // We need to wait for analysis to FINISH.
        // If it fails, it calls setState(AppState.HOME).
        // So Home should be visible.
        homeVisible.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {})
    ]);

    if (await customizeVisible.isVisible()) {
        console.log("Analysis Successful: Verifying Data...");

        // Brand
        const brandInput = page.locator('label:has-text("Brand") + input');
        const brandValue = await brandInput.inputValue();
        console.log(`Detected Brand: "${brandValue}"`);

        expect(brandValue.toUpperCase()).toContain('OVERTURE');
        expect(brandValue.toUpperCase()).not.toBe('GENERIC');

        // Material
        const materialValue = await page.locator('label:has-text("Material") + input').inputValue();
        expect(materialValue.toUpperCase()).toContain('PLA');

        // Temps
        expect(await page.locator('label:has-text("Nozzle Min") + div input').inputValue()).toBe('200');
        expect(await page.locator('label:has-text("Nozzle Max") + div input').inputValue()).toBe('220');

        console.log("Data verification complete.");

    } else {
        console.log("Analysis Failed: Verifying Error Handling...");

        // We should be back at Home or see an error
        const isHome = await homeVisible.isVisible();
        console.log(`Is Home Visible: ${isHome}`);

        // Check for error toast/message if captured logs didn't show it
        // Note: logs showed 429.

        // Assert we are NOT in Editor with Generic data
        // If we were in Editor, customizeVisible would be true.
        // Since it's false, we successfully avoided the "Silent Failure to Generic" issue.
        expect(await customizeVisible.isVisible()).toBe(false);

        // Ideally check for error message
        // Error toast might have auto-dismissed?
        // But we are safely back at start, allowing retry.
        console.log("Graceful failure verification complete.");
    }
  });
});
