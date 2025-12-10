
import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';

test.describe('Analysis Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API BEFORE navigation
    await page.route(/.*generativelanguage\.googleapis\.com.*|.*\/api\/gemini.*/, async route => {
        const candidateJson = JSON.stringify({
            candidates: [{
                content: {
                    parts: [{
                        text: "LOG: Detected brand: POLYMAKER\nLOG: Detected material: PETG\n" +
                              JSON.stringify({
                                 brand: "POLYMAKER",
                                 material: "PETG",
                                 colorName: "Teal",
                                 minTemp: 230,
                                 maxTemp: 250,
                                 bedTempMin: 70,
                                 bedTempMax: 80,
                                 hygroscopy: "medium",
                                 confidence: 95
                              })
                    }]
                }
            }]
        });

        // Mock SSE response
        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: `data: ${candidateJson}\n\n`
        });
    });

    await mockBluetooth(page);
    await page.goto('/');
  });

  test('Image Upload -> Analysis -> Data Pre-fill', async ({ page }) => {
    // Upload a dummy image file.
    await page.setInputFiles('input[type="file"]', {
        name: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake image content')
    });

    // Verify Analysis State (wait for it to appear - optional if transient)
    try {
        await expect(page.getByText(/Analyzing|Scanning/)).toBeVisible({ timeout: 5000 });
    } catch (e) {
        // Ignore timeout for transient state
    }

    // Verify Editor Population
    // After analysis, it switches to EDITING state.
    // Wait for data to populate
    await page.waitForTimeout(1000);

    // Check if we are back in editor (Customize text)
    await expect(page.getByText('Customize')).toBeVisible();

    // Check fields.
    await expect(page.locator('input[value="POLYMAKER"]')).toBeVisible(); // Brand
    await expect(page.locator('input[value="PETG"]')).toBeVisible(); // Material
  });
});
