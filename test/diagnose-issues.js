// @ts-check
// Diagnose and fix issues in the Fantasy Soundboard app
// 
// This script will:
// 1. Test WebSocket connections
// 2. Check for MUI Tooltip errors
//
// Run with: npx playwright test -c test/diagnose-issues.js

import { test, expect } from '@playwright/test';

test('Diagnose WebSocket connections and MUI Tooltip issues', async ({ page }) => {
  // Set up console error capture
  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Navigate to the app
  await page.goto('http://localhost:5173/');
  
  // Wait for the app to be fully loaded
  await page.waitForSelector('body', { state: 'attached' });
  
  // Wait for potential WebSocket issues to surface
  await page.waitForTimeout(3000);

  // Filter and analyze errors
  const wsErrors = consoleErrors.filter(err => 
    err.includes('WebSocket') || err.includes('ws://localhost')
  );
  
  const tooltipErrors = consoleErrors.filter(err => 
    err.includes('MUI: You have provided a `title` prop to the child of <Tooltip />')
  );
  
  console.log('\n===== DIAGNOSTIC RESULTS =====\n');
  
  // Report WebSocket errors
  if (wsErrors.length > 0) {
    console.log('❌ WebSocket Connection Issues Found:');
    console.log('   - Check vite.config.js to ensure correct WebSocket settings');
    console.log('   - Verify server.hmr configuration is properly set');
    console.log('   - Restart the dev server after making changes');
    console.log('\n   Sample errors:');
    wsErrors.slice(0, 2).forEach(err => console.log(`   ${err}`));
  } else {
    console.log('✅ No WebSocket connection issues detected');
  }
  
  console.log('\n');
  
  // Report MUI Tooltip errors
  if (tooltipErrors.length > 0) {
    console.log('❌ MUI Tooltip Issues Found:');
    console.log('   - Components inside <Tooltip> tags contain "title" attributes');
    console.log('   - Check components wrapped in <Tooltip> for any title props');
    console.log('\n   Sample errors:');
    tooltipErrors.slice(0, 2).forEach(err => console.log(`   ${err}`));
  } else {
    console.log('✅ No MUI Tooltip issues detected');
  }
  
  console.log('\n==============================\n');
  
  // Take a screenshot for reference
  await page.screenshot({ path: 'test-results/diagnostic-screenshot.png' });
}); 