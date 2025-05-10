// Run diagnostic tests on the Fantasy Soundboard app
// This script will analyze console logs for errors and provide a report

import { chromium } from '@playwright/test';

(async () => {
  // Configure colored output
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
  };

  console.log(`\n${colors.bright}${colors.blue}🧙 Fantasy Soundboard Diagnostics 🧙${colors.reset}\n`);
  console.log(`${colors.yellow}Starting diagnostic tests...${colors.reset}\n`);

  // Launch browser
  const browser = await chromium.launch({ 
    headless: true, // Change to headless for automatic running
    args: ['--window-size=1280,800']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  const errors = [];

  page.on('console', message => {
    const text = message.text();
    consoleMessages.push({
      type: message.type(),
      text: text
    });
    
    if (message.type() === 'error') {
      errors.push(text);
    }
  });

  try {
    // Navigate to the app - port will be dynamically replaced by the test script
    console.log(`${colors.yellow}Launching app...${colors.reset}`);
    await page.goto('http://localhost:PORT_PLACEHOLDER/');
    console.log(`${colors.green}✓ App loaded${colors.reset}`);
    
    // Wait for app to fully initialize
    console.log(`${colors.yellow}Waiting for app to initialize...${colors.reset}`);
    await page.waitForTimeout(3000);
    
    // Analyze errors
    const wsErrors = errors.filter(err => 
      err.includes('WebSocket') || err.includes('ws://localhost')
    );
    
    const tooltipErrors = errors.filter(err => 
      err.includes('MUI: You have provided a `title` prop to the child of <Tooltip />')
    );
    
    console.log(`\n${colors.bright}${colors.blue}=== Diagnostic Results ===${colors.reset}\n`);
    
    // WebSocket errors
    if (wsErrors.length > 0) {
      console.log(`${colors.red}❌ WebSocket Connection Issues: ${wsErrors.length}${colors.reset}`);
      console.log(`${colors.yellow}Sample errors:${colors.reset}`);
      wsErrors.slice(0, 2).forEach(err => console.log(`  - ${err}`));
    } else {
      console.log(`${colors.green}✓ No WebSocket connection issues detected${colors.reset}`);
    }
    
    console.log();
    
    // Tooltip errors
    if (tooltipErrors.length > 0) {
      console.log(`${colors.red}❌ MUI Tooltip Issues: ${tooltipErrors.length}${colors.reset}`);
      console.log(`${colors.yellow}Sample errors:${colors.reset}`);
      tooltipErrors.slice(0, 2).forEach(err => console.log(`  - ${err}`));
    } else {
      console.log(`${colors.green}✓ No MUI Tooltip issues detected${colors.reset}`);
    }
    
    // Other errors
    const otherErrors = errors.filter(err => 
      !err.includes('WebSocket') && 
      !err.includes('ws://localhost') &&
      !err.includes('MUI: You have provided a `title` prop to the child of <Tooltip />')
    );
    
    if (otherErrors.length > 0) {
      console.log(`\n${colors.red}❌ Other Errors: ${otherErrors.length}${colors.reset}`);
      console.log(`${colors.yellow}Sample errors:${colors.reset}`);
      otherErrors.slice(0, 2).forEach(err => console.log(`  - ${err}`));
    }
    
    // Interactive testing
    console.log(`\n${colors.yellow}Performing interactive testing...${colors.reset}`);
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'test-results/app-screenshot.png' });
    console.log(`${colors.green}✓ Screenshot captured: test-results/app-screenshot.png${colors.reset}`);
    
    // Check for flashing sound modules
    try {
      // Look for any potential flashing elements
      console.log(`${colors.yellow}Checking for UI flashing issues...${colors.reset}`);
      
      // Monitor for visibility changes of paper elements (card-like components)
      let flashingDetected = false;
      const flashCountMap = new Map();
      
      // Monitor key UI elements that might flash
      const elementsToCheck = [
        '.MuiPaper-root', 
        '.MuiCard-root', 
        '.MuiButton-root',
        '.sound-item',
        '[data-sound-item]'
      ];
      
      // Check for any visible elements matching our selectors
      const hasElements = await page.evaluate((selectors) => {
        for (const selector of selectors) {
          if (document.querySelector(selector)) {
            return true;
          }
        }
        return false;
      }, elementsToCheck);
      
      if (!hasElements) {
        console.log(`${colors.yellow}No UI elements to check for flashing${colors.reset}`);
      } else {
        // Check for rapid style changes
        for (let i = 0; i < 10; i++) {
          const elementInfo = await page.evaluate((selectors) => {
            const info = [];
            selectors.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                for (let el of elements) {
                  const rect = el.getBoundingClientRect();
                  const computedStyle = window.getComputedStyle(el);
                  info.push({
                    selector,
                    id: el.id || el.getAttribute('data-sound-id') || `${selector}-${info.length}`,
                    visible: rect.width > 0 && rect.height > 0,
                    opacity: computedStyle.opacity,
                    transform: computedStyle.transform,
                    boxShadow: computedStyle.boxShadow
                  });
                }
              }
            });
            return info;
          }, elementsToCheck);
          
          elementInfo.forEach(element => {
            const id = element.id;
            if (!flashCountMap.has(id)) {
              flashCountMap.set(id, { count: 1, lastState: JSON.stringify(element) });
            } else {
              const data = flashCountMap.get(id);
              const currentState = JSON.stringify(element);
              if (data.lastState !== currentState) {
                data.count++;
                data.lastState = currentState;
                flashCountMap.set(id, data);
              }
            }
          });
          
          await page.waitForTimeout(300);
        }
        
        // Check if any elements flashed more than 3 times
        flashCountMap.forEach((data, id) => {
          if (data.count > 3) {
            flashingDetected = true;
            console.log(`${colors.red}❌ UI element ${id} is flashing${colors.reset}`);
          }
        });
        
        if (!flashingDetected) {
          console.log(`${colors.green}✓ No UI flashing detected${colors.reset}`);
        }
      }
    } catch (error) {
      console.log(`${colors.yellow}Could not check for flashing modules: ${error.message}${colors.reset}`);
    }
    
    // Final report
    console.log(`\n${colors.bright}${colors.blue}=== Summary ===${colors.reset}`);
    console.log(`${colors.bright}Total errors: ${errors.length}${colors.reset}`);
    console.log(`${colors.bright}- WebSocket issues: ${wsErrors.length}${colors.reset}`);
    console.log(`${colors.bright}- MUI Tooltip issues: ${tooltipErrors.length}${colors.reset}`);
    console.log(`${colors.bright}- Other issues: ${otherErrors.length}${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}Error during test:${colors.reset}`, error);
  } finally {
    console.log(`${colors.green}✅ Tests completed! Closing browser automatically...${colors.reset}\n`);
    
    // Close the browser automatically
    await browser.close();
    
    // Exit with appropriate code based on errors
    process.exit(errors.length > 0 ? 1 : 0);
  }
})(); 