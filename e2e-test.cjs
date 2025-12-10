const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 Starting end-to-end test...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[DEBUG]') || text.includes('[LOG]') || text.includes('[ERROR]')) {
      console.log(`📝 ${text}`);
    }
  });
  
  try {
    // Navigate to app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot of home page
    await page.screenshot({ path: '/tmp/01-home.png', fullPage: true });
    console.log('✅ Home page loaded\n');
    
    // Find and click "From Gallery" button
    console.log('📸 Clicking "From Gallery" button...');
    const galleryButton = await page.locator('button:has-text("From Gallery")');
    await galleryButton.click();
    await page.waitForTimeout(1000);
    
    // Use a real test image (we'll create one)
    const testImagePath = path.join(__dirname, 'test-filament.jpg');
    
    // Check if test image exists, if not create a simple one
    if (!fs.existsSync(testImagePath)) {
      console.log('⚠️  No test image found, using placeholder...');
      // We'll handle file upload differently
    }
    
    // Set up file chooser handler
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('input[type="file"]').first().click()
    ]);
    
    // Upload the test image from the repo if it exists
    const possibleImages = [
      '/home/runner/work/FilamentLabelD30/FilamentLabelD30/PXL_20251206_005034192.jpg',
      '/home/runner/work/FilamentLabelD30/FilamentLabelD30/test-filament.jpg'
    ];
    
    let uploadedImage = null;
    for (const imgPath of possibleImages) {
      if (fs.existsSync(imgPath)) {
        uploadedImage = imgPath;
        break;
      }
    }
    
    if (uploadedImage) {
      console.log(`📤 Uploading image: ${uploadedImage}`);
      await fileChooser.setFiles(uploadedImage);
    } else {
      console.log('❌ No test image available, creating placeholder...');
      // Create a minimal test image (1x1 pixel)
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(testImagePath, buffer);
      await fileChooser.setFiles(testImagePath);
    }
    
    console.log('✅ Image uploaded, waiting for analysis...\n');
    await page.waitForTimeout(3000);
    
    // Take screenshot of analysis page
    await page.screenshot({ path: '/tmp/02-analysis.png', fullPage: true });
    console.log('📸 Analysis page screenshot taken\n');
    
    // Wait for analysis to complete or timeout after 30 seconds
    console.log('⏳ Waiting for analysis to complete (max 30s)...');
    let analysisComplete = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!analysisComplete && attempts < maxAttempts) {
      const state = await page.evaluate(() => {
        const analyzing = document.body.textContent.includes('ANALYZING');
        const editor = document.body.textContent.includes('EDITOR') || 
                      document.body.textContent.includes('BRAND') && 
                      document.body.textContent.includes('MATERIAL');
        return { analyzing, editor };
      });
      
      if (state.editor) {
        analysisComplete = true;
        console.log('✅ Analysis completed!\n');
      } else if (!state.analyzing) {
        console.log('⚠️  Not in analysis state, checking current page...');
        break;
      }
      
      await page.waitForTimeout(1000);
      attempts++;
      
      if (attempts % 5 === 0) {
        console.log(`   ... still analyzing (${attempts}s elapsed)`);
      }
    }
    
    if (!analysisComplete) {
      console.log('⏰ Analysis timeout or completed faster than expected\n');
    }
    
    // Take screenshot of editor/final page
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/03-editor.png', fullPage: true });
    console.log('📸 Editor page screenshot taken\n');
    
    // Extract form data
    console.log('📊 Extracting form data...');
    const formData = await page.evaluate(() => {
      const getData = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.value || el.textContent || el.innerText : null;
      };
      
      return {
        brand: getData('input[placeholder*="Brand" i], input[name="brand" i]') || 
               document.body.textContent.match(/BRAND[:\s]+([A-Z][A-Za-z®™]+)/)?.[1],
        material: getData('input[placeholder*="Material" i], input[name="material" i]') ||
                 document.body.textContent.match(/MATERIAL[:\s]+([A-Z][A-Za-z\s]+)/)?.[1],
        color: getData('input[placeholder*="Color" i], input[name="color" i]') ||
              document.body.textContent.match(/COLOR[:\s]+([A-Za-z\s]+)/)?.[1],
        fullText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('\n📋 FORM DATA RESULTS:');
    console.log('  Brand:', formData.brand || '❌ NOT FOUND');
    console.log('  Material:', formData.material || '❌ NOT FOUND');
    console.log('  Color:', formData.color || '❌ NOT FOUND');
    console.log('\n');
    
    // Check if data is generic defaults or actual values
    const hasRealData = formData.brand && formData.brand !== 'GENERIC' &&
                       formData.material && formData.material !== 'PLA' &&
                       formData.color && formData.color !== 'White';
    
    if (hasRealData) {
      console.log('✅ SUCCESS: Real data populated in form!');
    } else {
      console.log('❌ FAILURE: Form still shows default values');
      console.log('\n🔍 Page content sample:');
      console.log(formData.fullText);
    }
    
    // Save console logs
    fs.writeFileSync('/tmp/console-logs.txt', consoleLogs.join('\n'));
    console.log('\n💾 Console logs saved to /tmp/console-logs.txt');
    console.log(`   Total log entries: ${consoleLogs.length}`);
    
    // Find relevant debug logs
    const debugLogs = consoleLogs.filter(log => log.includes('[DEBUG]'));
    if (debugLogs.length > 0) {
      console.log('\n🔍 DEBUG LOGS FOUND:');
      debugLogs.slice(0, 10).forEach(log => console.log(`   ${log}`));
      if (debugLogs.length > 10) {
        console.log(`   ... and ${debugLogs.length - 10} more`);
      }
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   /tmp/01-home.png');
    console.log('   /tmp/02-analysis.png');
    console.log('   /tmp/03-editor.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: '/tmp/error.png', fullPage: true });
    console.log('   Error screenshot saved to /tmp/error.png');
  } finally {
    await browser.close();
    console.log('\n✅ Test complete!');
  }
})();
