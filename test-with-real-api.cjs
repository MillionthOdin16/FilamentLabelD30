const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testImageProcessing() {
  console.log('🧪 Starting comprehensive image processing test...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    permissions: []
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[DEBUG]') || text.includes('[LOG]') || text.includes('Gemini') || text.includes('Detected')) {
      console.log(`[BROWSER] ${text}`);
    }
  });
  
  // Navigate to app
  console.log('📱 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('📸 Taking screenshot of home page...');
  await page.screenshot({ path: '/tmp/test-home.png', fullPage: true });
  
  // Click "From Gallery" button
  console.log('🖱️  Clicking "From Gallery" button...');
  const fromGalleryButton = page.locator('button:has-text("From Gallery")');
  await fromGalleryButton.waitFor({ state: 'visible', timeout: 5000 });
  
  // Set up file chooser handler
  const testImagePath = path.join(__dirname, 'PXL_20251206_005034192.jpg');
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    await browser.close();
    return;
  }
  
  console.log('📁 Setting up file chooser with image:', testImagePath);
  const fileChooserPromise = page.waitForEvent('filechooser');
  await fromGalleryButton.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(testImagePath);
  
  console.log('⏳ Waiting for analysis to start...');
  await page.waitForTimeout(3000);
  
  // Check for ANALYZING state
  const analyzingText = await page.locator('text=ANALYZING').count();
  if (analyzingText > 0) {
    console.log('✅ Analysis screen detected!');
    await page.screenshot({ path: '/tmp/test-analyzing.png', fullPage: true });
  }
  
  // Wait for analysis to complete (up to 30 seconds)
  console.log('⏳ Waiting for analysis to complete (max 30s)...');
  let analysisComplete = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    
    // Check if we've moved to editor screen
    const editorVisible = await page.locator('text=BRAND').count();
    if (editorVisible > 0) {
      console.log(`✅ Analysis completed in ${i + 1} seconds!`);
      analysisComplete = true;
      break;
    }
    
    if (i % 5 === 0) {
      console.log(`   ... still analyzing (${i + 1}s elapsed)`);
    }
  }
  
  if (!analysisComplete) {
    console.log('⚠️  Analysis did not complete within 30s');
    await page.screenshot({ path: '/tmp/test-timeout.png', fullPage: true });
  } else {
    // Take screenshot of editor page
    await page.waitForTimeout(2000);
    console.log('📸 Taking screenshot of editor page...');
    await page.screenshot({ path: '/tmp/test-editor.png', fullPage: true });
    
    // Extract form field values
    console.log('\n📋 Extracting form field values...\n');
    
    const brandValue = await page.inputValue('input[placeholder*="Brand" i], input[id*="brand" i]').catch(() => 'NOT FOUND');
    const materialValue = await page.inputValue('input[placeholder*="Material" i], input[id*="material" i]').catch(() => 'NOT FOUND');
    const colorValue = await page.inputValue('input[placeholder*="Color" i], input[id*="color" i]').catch(() => 'NOT FOUND');
    
    console.log(`   Brand:    "${brandValue}"`);
    console.log(`   Material: "${materialValue}"`);
    console.log(`   Color:    "${colorValue}"`);
    
    // Check if data was populated
    if (brandValue !== 'GENERIC' && brandValue !== 'NOT FOUND' && brandValue !== '') {
      console.log('\n✅ SUCCESS: Form fields populated with extracted data!');
    } else {
      console.log('\n❌ ISSUE: Form still shows default values');
    }
  }
  
  // Print relevant console logs
  console.log('\n📝 Relevant console logs:\n');
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('[DEBUG]') || 
    log.includes('Detected brand:') || 
    log.includes('Detected material:') ||
    log.includes('Detected color') ||
    log.includes('Final merge') ||
    log.includes('Progressive update')
  );
  
  relevantLogs.slice(0, 20).forEach(log => console.log(`   ${log}`));
  if (relevantLogs.length > 20) {
    console.log(`   ... and ${relevantLogs.length - 20} more debug logs`);
  }
  
  console.log('\n📸 Screenshots saved:');
  console.log('   - /tmp/test-home.png');
  console.log('   - /tmp/test-analyzing.png');
  console.log('   - /tmp/test-editor.png');
  
  await browser.close();
  console.log('\n✅ Test complete!');
}

testImageProcessing().catch(console.error);
