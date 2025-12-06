
import { test, expect } from '@playwright/test';
import { mockBluetooth } from '../fixtures/mock-bluetooth';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Image Scanning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages (useful for debugging)
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]')) {
        console.log('BROWSER:', msg.text());
      }
    });
    
    await mockBluetooth(page);
    await page.goto('/');
    await expect(page.locator('text=Filament ID')).toBeVisible({ timeout: 30000 });
  });

  test('Upload Image -> See Processing Screen with Status Updates', async ({ page }) => {
    // This test verifies the UI behavior when uploading an image
    // It doesn't require a real API key - it tests that the ANALYZING view appears
    
    const filePath = path.join(__dirname, '../fixtures/filament-spool-test.jpg');

    // Directly set the file on the hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for ANALYZING state to appear
    await expect(page.locator('text=ANALYZING')).toBeVisible({ timeout: 10000 });

    // Check that the processing screen appears with the image
    const analysisView = page.locator('[class*="fixed inset-0"]').first();
    await expect(analysisView).toBeVisible();

    // Check for the terminal log section
    await expect(page.locator('text=NEURAL ENGINE LOG')).toBeVisible();

    // Check that at least the initial log appears
    await expect(page.locator('text=INITIALIZING OPTICAL SCAN')).toBeVisible({ timeout: 5000 });

    // Wait for transition to EDITING state (after error or success)
    // Check for editor fields appearing
    await expect(page.locator('label:has-text("Brand")')).toBeVisible({ timeout: 15000 });
  });
});
