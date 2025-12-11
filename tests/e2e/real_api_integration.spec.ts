
import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';
import fs from 'fs';
import path from 'path';

test.describe('Real API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Only mock bluetooth, allow network
    await mockBluetooth(page);
    await page.goto('/');
  });

  test('Upload Real Image -> Gemini API -> Data Pre-fill', async ({ page }) => {
    // 1. Upload the generated image
    // Ensure the image exists
    const imagePath = path.join(process.cwd(), 'tests/fixtures/sample_spool.jpg');
    if (!fs.existsSync(imagePath)) {
        test.skip(true, 'Sample image not found');
    }

    await page.setInputFiles('input[type="file"]', {
        name: 'sample_spool.jpg',
        mimeType: 'image/jpeg',
        buffer: fs.readFileSync(imagePath)
    });

    // 2. Wait for Analysis
    // This calls the real API, so it might take 5-10 seconds.
    // "Analyzing..." should appear.
    try {
        await expect(page.getByText(/Analyzing|Scanning/)).toBeVisible({ timeout: 10000 });
    } catch(e) {
        console.log("Analyzing view appeared/disappeared quickly");
    }

    // 3. Verify Data
    // We expect the API to read "OVERTURE", "PLA", "Red", "200", "220".
    // Increase timeout for API latency
    await page.waitForTimeout(5000);

    await expect(page.getByText('Customize')).toBeVisible({ timeout: 30000 });

    // Check specific values
    const brandInput = page.locator('input[value="OVERTURE"]');
    const materialInput = page.locator('input[value="PLA"]');
    // Note: Brand might be "OVERTURE" or "Overture". Regex matching is safer if value locator fails.
    // But let's try value first.

    // Check if ANY brand field contains Overture
    const brandValue = await page.locator('label:has-text("Brand") + input').inputValue();
    expect(brandValue.toUpperCase()).toContain('OVERTURE');

    const materialValue = await page.locator('label:has-text("Material") + input').inputValue();
    expect(materialValue.toUpperCase()).toContain('PLA');

    // Check Temps
    // Nozzle Min should be 200
    // The slider component might not expose the value directly in a simple input,
    // but the inputs next to it (if any) or the state.
    // In `LabelEditor.tsx`:
    /*
             <SmartSlider
                label="Nozzle Min"
                value={data.minTemp}
                ...
             />
    */
    // SmartSlider usually has an input.
    // Locator: label:has-text("Nozzle Min") + div input
    const nozzleMin = await page.locator('label:has-text("Nozzle Min") + div input').inputValue();
    expect(nozzleMin).toBe('200');

    const nozzleMax = await page.locator('label:has-text("Nozzle Max") + div input').inputValue();
    expect(nozzleMax).toBe('220');
  });
});
