import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Gemini API Direct Test', () => {
  test('Test real Gemini API call with image', async ({ page }) => {
    // Navigate to a simple page
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Inject test code directly
    const result = await page.evaluate(async () => {
      try {
        // Import the service
        const { analyzeFilamentImage } = await import('/services/geminiService.ts');
        
        // Load the test image
        const response = await fetch('/tests/fixtures/filament-spool-test.jpg');
        const blob = await response.blob();
        
        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        const base64 = await base64Promise;
        
        // Track logs
        const logs = [];
        const boxes = [];
        
        // Call the API
        const data = await analyzeFilamentImage(
          base64,
          (log) => { logs.push(log); console.log('[GEMINI LOG]', log); },
          (box) => { boxes.push(box); console.log('[GEMINI BOX]', box); }
        );
        
        return { success: true, data, logs, boxes };
      } catch (error) {
        return { success: false, error: error.message, stack: error.stack };
      }
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('API call failed:', result.error);
      console.error('Stack:', result.stack);
    } else {
      console.log('Data:', result.data);
      console.log('Logs count:', result.logs.length);
      console.log('Boxes count:', result.boxes.length);
    }
    
    expect(result.success).toBe(true);
  });
});
