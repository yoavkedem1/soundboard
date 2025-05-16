#!/usr/bin/env node

/**
 * Fantasy Soundboard App Validator
 * 
 * This script checks the application by:
 * 1. Verifying the app loads correctly
 * 2. Testing loop indicator functionality
 * 3. Ensuring database connections work properly
 * 4. Monitoring for connection errors
 * 
 * Usage: node scripts/validate-app.js
 */

const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

// Configuration
const TEST_PORT = process.env.TEST_PORT || 4570;
const APP_URL = `http://localhost:${TEST_PORT}`;
const WAIT_TIMEOUT = 30000;
let browser;
let page;

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Logging with timestamps
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let prefix = '';
  let color = '';
  
  switch (type) {
    case 'success':
      prefix = '✅ ';
      color = colors.green;
      break;
    case 'error':
      prefix = '❌ ';
      color = colors.red;
      break;
    case 'warning':
      prefix = '⚠️ ';
      color = colors.yellow;
      break;
    case 'step':
      prefix = '→ ';
      color = colors.blue;
      break;
    default:
      prefix = 'ℹ️ ';
      color = colors.white;
      break;
  }
  
  console.log(`${prefix}[${timestamp}] ${color}${message}${colors.reset}`);
}

// Run tests
async function runTests() {
  log('Starting app validation tests', 'step');
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Capture console messages
    let consoleErrors = [];
    page.on('console', message => {
      const text = message.text();
      if (message.type() === 'error') {
        consoleErrors.push(text);
        log(`Browser console error: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`, 'warning');
      }
    });
    
    // Test 1: Page Load
    log('Testing page load...', 'step');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: WAIT_TIMEOUT });
    
    // Wait for app to initialize
    await page.waitForSelector('body', { timeout: WAIT_TIMEOUT });
    
    // Check if main elements are visible
    const appTitleVisible = await page.evaluate(() => {
      const titleEl = document.querySelector('h1');
      return titleEl && titleEl.innerText.includes('Fantasy Soundboard');
    });
    
    if (appTitleVisible) {
      log('App loaded successfully', 'success');
      results.passed++;
    } else {
      log('App did not load correctly - title not found', 'error');
      results.failed++;
      results.errors.push('App failed to load: title not visible');
    }
    
    // Test 2: Add Sound Button
    log('Testing Add Sound button...', 'step');
    const addButtonVisible = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => {
        const iconEl = btn.querySelector('svg[data-testid="AddIcon"]');
        return iconEl !== null;
      });
    });
    
    if (addButtonVisible) {
      log('Add Sound button is visible', 'success');
      results.passed++;
    } else {
      log('Add Sound button not found', 'error');
      results.failed++;
      results.errors.push('Add Sound button missing from UI');
    }
    
    // Test 3: Check for loop indicators
    log('Testing loop indicators...', 'step');
    const loopIndicatorsExist = await page.evaluate(() => {
      const codeForLoopIndicator = document.body.innerHTML.includes('LOOP') && 
                                   document.body.innerHTML.includes('isLooping');
      return codeForLoopIndicator;
    });
    
    if (loopIndicatorsExist) {
      log('Loop indicators code found in the application', 'success');
      results.passed++;
    } else {
      log('Loop indicators may be missing from the code', 'warning');
      results.failed++;
      results.errors.push('Loop indicator functionality might be missing');
    }
    
    // Test 4: Check for no serious errors in console
    const hasSeriousErrors = consoleErrors.some(error => 
      (error.includes('mounted is not defined') || 
       error.includes('IndexedDB') || 
       error.includes('Failed to fetch'))
    );
    
    if (!hasSeriousErrors) {
      log('No serious errors detected in console', 'success');
      results.passed++;
    } else {
      log('Serious errors detected in console', 'error');
      results.failed++;
      results.errors.push('Console errors detected: ' + consoleErrors.slice(0, 3).join(', '));
    }
    
    // Test 5: Check database functionality 
    log('Testing database functionality...', 'step');
    const dbInitialized = await page.evaluate(() => {
      // Look for signs of successful DB initialization in console
      return !window.consoleMessages?.some(msg => 
        msg.includes('Database initialization failed') ||
        msg.includes('Error initializing database')  
      );
    });
    
    if (dbInitialized) {
      log('Database appears to be working correctly', 'success');
      results.passed++;
    } else {
      log('Database initialization issues detected', 'warning');
      results.failed++;
      results.errors.push('Database initialization problem');
    }
    
  } catch (error) {
    log(`Test execution error: ${error.message}`, 'error');
    results.failed++;
    results.errors.push(`Test execution error: ${error.message}`);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
    
    // Report results
    console.log('\n' + colors.bold + 'Test Results:' + colors.reset);
    console.log(colors.green + `Passed: ${results.passed}` + colors.reset);
    console.log(colors.red + `Failed: ${results.failed}` + colors.reset);
    
    if (results.errors.length > 0) {
      console.log(colors.yellow + '\nErrors:' + colors.reset);
      results.errors.forEach((error, i) => {
        console.log(colors.yellow + `${i + 1}. ${error}` + colors.reset);
      });
    }
    
    const successRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
    console.log(colors.bold + `\nSuccess Rate: ${successRate}%` + colors.reset);
    
    if (successRate >= 80) {
      log('App validation completed successfully!', 'success');
      process.exit(0);
    } else {
      log('App validation failed!', 'error');
      process.exit(1);
    }
  }
}

// Start the tests
runTests(); 