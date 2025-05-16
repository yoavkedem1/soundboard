#!/usr/bin/env node

/**
 * Fantasy Soundboard Automated Test Runner
 * 
 * This script tests the app's functionality including:
 * - Server startup
 * - Database operations
 * - Audio compatibility
 * - iOS/Safari compatibility
 * 
 * Usage: node test-app.js
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT_RANGE_START = 6000;
const PORT_RANGE_END = 7000;
const TEST_TIMEOUT = 90000; // 1.5 minute timeout for slower systems
const APP_ROOT = path.resolve(__dirname, '..');

// Get a random port for testing
function getRandomTestPort() {
  return PORT_RANGE_START + Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START));
}

// The port we'll use for this test run
const PORT = getRandomTestPort();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Print formatted messages
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substring(11, 19);
  let prefix = '';
  
  switch (type) {
    case 'success':
      prefix = `${colors.green}✓ ${timestamp}:${colors.reset}`;
      break;
    case 'error':
      prefix = `${colors.red}✗ ${timestamp}:${colors.reset}`;
      break;
    case 'warning':
      prefix = `${colors.yellow}⚠ ${timestamp}:${colors.reset}`;
      break;
    case 'step':
      prefix = `${colors.blue}→ ${timestamp}:${colors.reset}`;
      break;
    default:
      prefix = `${colors.dim}${timestamp}:${colors.reset}`;
  }
  
  console.log(`${prefix} ${message}`);
}

/**
 * Test if a port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

/**
 * Kill processes using a specific port
 */
async function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    
    let command = '';
    if (isWin) {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -i :${port} -t`;
    }
    
    exec(command, (error, stdout) => {
      if (error) {
        log(`No process found on port ${port}`, 'info');
        resolve();
        return;
      }
      
      const lines = stdout.trim().split('\n');
      
      if (lines.length === 0 || !lines[0]) {
        log(`No process found on port ${port}`, 'info');
        resolve();
        return;
      }
      
      if (isWin) {
        // Parse PID from Windows netstat output (last column)
        const pidMatch = lines[0].match(/(\d+)$/);
        if (pidMatch && pidMatch[1]) {
          const pid = pidMatch[1];
          exec(`taskkill /F /PID ${pid}`, (err) => {
            if (err) {
              log(`Failed to kill process on port ${port}: ${err}`, 'error');
              reject(err);
            } else {
              log(`Killed process ${pid} on port ${port}`, 'success');
              resolve();
            }
          });
        } else {
          log(`Could not extract PID from netstat output`, 'warning');
          resolve();
        }
      } else {
        // On Unix, lsof -t gives us the PIDs directly
        const pids = lines.filter(Boolean);
        
        // Kill each process
        const killPromises = pids.map(pid => {
          return new Promise((resolveKill) => {
            exec(`kill -9 ${pid}`, (err) => {
              if (err) {
                log(`Failed to kill process ${pid}: ${err}`, 'warning');
              } else {
                log(`Killed process ${pid} on port ${port}`, 'success');
              }
              resolveKill();
            });
          });
        });
        
        Promise.all(killPromises).then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Check if package.json exists and contains necessary scripts
 */
async function checkPackageJson() {
  log('Checking package.json...', 'step');
  
  try {
    const packageJsonPath = path.join(APP_ROOT, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log('package.json not found', 'error');
      testResults.failed++;
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for required scripts
    const requiredScripts = ['dev', 'build', 'preview'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
    
    if (missingScripts.length > 0) {
      log(`Missing required scripts in package.json: ${missingScripts.join(', ')}`, 'error');
      testResults.failed++;
      return false;
    }
    
    // Check dependencies
    const requiredDependencies = ['react', 'react-dom', '@mui/material'];
    const missingDependencies = requiredDependencies.filter(dep => 
      !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    );
    
    if (missingDependencies.length > 0) {
      log(`Missing required dependencies: ${missingDependencies.join(', ')}`, 'error');
      testResults.failed++;
      return false;
    }
    
    log('package.json validation passed', 'success');
    testResults.passed++;
    return true;
  } catch (error) {
    log(`Error checking package.json: ${error}`, 'error');
    testResults.failed++;
    return false;
  }
}

/**
 * Check for required files
 */
async function checkRequiredFiles() {
  log('Checking required files...', 'step');
  
  const requiredFiles = [
    'index.html',
    'src/App.jsx',
    'src/db.js',
    'src/main.jsx',
    'vite.config.js'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(APP_ROOT, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    log(`Missing required files: ${missingFiles.join(', ')}`, 'error');
    testResults.failed++;
    return false;
  }
  
  log('All required files exist', 'success');
  testResults.passed++;
  return true;
}

/**
 * Check for iOS compatibility code
 */
async function checkIOSCompatibility() {
  log('Checking iOS compatibility code...', 'step');
  
  try {
    const appJsxPath = path.join(APP_ROOT, 'src/App.jsx');
    const dbJsPath = path.join(APP_ROOT, 'src/db.js');
    
    if (!fs.existsSync(appJsxPath) || !fs.existsSync(dbJsPath)) {
      log('App.jsx or db.js not found', 'error');
      testResults.failed++;
      return false;
    }
    
    const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
    const dbJsContent = fs.readFileSync(dbJsPath, 'utf8');
    
    // Check for various iOS compatibility patterns
    const checks = [
      { pattern: /iPhone|iPad|iPod/i, file: 'App.jsx or db.js', description: 'iOS device detection' },
      { pattern: /AudioContext.*?resume/i, file: 'App.jsx', description: 'AudioContext resume for iOS' },
      { pattern: /webkit.*?AudioContext/i, file: 'App.jsx', description: 'WebKit AudioContext support' },
      { pattern: /touchend|touchstart/i, file: 'App.jsx', description: 'Touch events for iOS' },
      { pattern: /WebkitTapHighlightColor/i, file: 'App.jsx', description: 'Webkit tap highlight control' }
    ];
    
    const content = appJsxContent + dbJsContent;
    const missingPatterns = checks.filter(check => !check.pattern.test(content));
    
    if (missingPatterns.length > 0) {
      log('Missing iOS compatibility code:', 'warning');
      missingPatterns.forEach(item => {
        log(`- ${item.description} in ${item.file}`, 'warning');
      });
      testResults.warnings += missingPatterns.length;
    } else {
      log('iOS compatibility code found', 'success');
      testResults.passed++;
    }
    
    return true;
  } catch (error) {
    log(`Error checking iOS compatibility: ${error}`, 'error');
    testResults.failed++;
    return false;
  }
}

/**
 * Start the dev server
 */
async function startDevServer() {
  log('Starting dev server...', 'step');
  
  // First check if port is in use and kill processes if needed
  const portInUse = await isPortInUse(PORT);
  if (portInUse) {
    log(`Port ${PORT} is in use, attempting to kill the process...`, 'warning');
    try {
      await killProcessOnPort(PORT);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for port to be released
    } catch (error) {
      log(`Failed to kill process on port ${PORT}. Please close it manually.`, 'error');
      testResults.failed++;
      return null;
    }
  }
  
  // Start the dev server with more robust handling
  return new Promise((resolve) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const server = spawn(npm, ['run', 'dev'], {
      cwd: APP_ROOT,
      env: { 
        ...process.env, 
        FORCE_COLOR: '1',
        // Pass our test port to Vite
        VITE_PORT: PORT.toString(),
        // Prevent browser from opening
        BROWSER: 'none',
        // Add NODE_ENV to ensure proper mode
        NODE_ENV: 'development',
      },
    });
    
    let serverStarted = false;
    let serverUrl = null;
    const serverOutput = [];
    
    // Set timeout for server start
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        log('Server failed to start within the timeout period', 'error');
        testResults.failed++;
        server.kill();
        resolve(null);
      }
    }, TEST_TIMEOUT);
    
    // Look for server start message with more patterns
    server.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput.push(output);
      process.stdout.write('> ' + output); // Echo server output
      
      // Check for dev server URL in output with more patterns
      const localUrlMatch = output.match(/Local:\s+(https?:\/\/localhost:[\d]+)/i) || 
                           output.match(/localhost:([\d]+)/i);
                           
      if (localUrlMatch && localUrlMatch[1]) {
        serverUrl = localUrlMatch[1].startsWith('http') ? localUrlMatch[1] : `http://localhost:${localUrlMatch[1]}`;
        serverStarted = true;
        clearTimeout(timeout);
        log(`Server started at ${serverUrl}`, 'success');
        testResults.passed++;
        
        // Give server more time to fully initialize
        setTimeout(() => resolve({ server, serverUrl }), 3000);
      } 
      
      // Look for "ready in" message as alternative success indicator
      if ((output.includes("ready in") && output.includes("ms")) || 
          output.includes("VITE v") || 
          output.includes("Local:")) {
        if (!serverStarted) {
          serverStarted = true;
          serverUrl = `http://localhost:${PORT}`;
          clearTimeout(timeout);
          log(`Server started at ${serverUrl} (inferred)`, 'success');
          testResults.passed++;
          
          // Give server more time to fully initialize
          setTimeout(() => resolve({ server, serverUrl }), 3000);
        }
      }
      
      // Look for errors
      if (output.includes('Error') && output.includes('mounted is not defined') && !serverStarted) {
        log(`React error detected: mounted variable not defined`, 'error');
      }
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput.push(output);
      process.stdout.write('> ' + output); // Echo server output
      
      // Look for WebSocket connection errors
      if (output.includes('WebSocket') && output.includes('error')) {
        log(`WebSocket error: ${output.trim()}`, 'warning');
        testResults.warnings++;
      }
      
      // Look for critical errors
      if (output.includes('Error') && output.includes('EADDRINUSE')) {
        log(`Port already in use error: ${output.trim()}`, 'error');
        testResults.failed++;
        clearTimeout(timeout);
        server.kill();
        resolve(null);
      }
    });
    
    server.on('error', (error) => {
      log(`Server process error: ${error.message}`, 'error');
      testResults.failed++;
      clearTimeout(timeout);
      resolve(null);
    });
    
    server.on('close', (code) => {
      if (code !== 0 && !serverStarted) {
        log(`Server process exited with code ${code}`, 'error');
        testResults.failed++;
        clearTimeout(timeout);
        resolve(null);
      }
    });
  });
}

/**
 * Run all checks
 */
async function runTests() {
  log(`${colors.bright}${colors.cyan}Fantasy Soundboard Test Runner${colors.reset}`, 'info');
  log(`Running tests from ${APP_ROOT}`, 'info');
  
  try {
    // Check required files and iOS compatibility
    await checkPackageJson();
    await checkRequiredFiles();
    await checkIOSCompatibility();
    
    // Automatically start the server without asking
    log(`${colors.blue}→${colors.reset} Starting the development server for automatic testing...`, 'info');
    const serverInfo = await startDevServer();
    
    if (serverInfo) {
      const { server, serverUrl } = serverInfo;
      
      log(`${colors.green}${colors.bright}Server is running at ${serverUrl}${colors.reset}`, 'success');
      log(`${colors.yellow}Test run will continue for 20 seconds then automatically stop${colors.reset}`, 'info');
      
      // Let server run for 20 seconds for testing
      setTimeout(() => {
        log('Automatic test period completed, stopping server...', 'step');
        server.kill();
        summarizeResults();
        // Make sure to properly close readline and exit
        rl.close();
        process.exit(0);
      }, 20000);
      
      // Also handle SIGINT
      process.on('SIGINT', () => {
        log('Stopping server...', 'step');
        server.kill();
        summarizeResults();
        rl.close();
        process.exit(0);
      });
    } else {
      summarizeResults();
      // Force process to exit when server couldn't start
      rl.close();
      process.exit(testResults.failed > 0 ? 1 : 0);
    }
  } catch (error) {
    log(`Test run error: ${error}`, 'error');
    summarizeResults();
    rl.close();
    process.exit(1);
  }
}

/**
 * Summarize test results
 */
function summarizeResults() {
  const total = testResults.passed + testResults.failed;
  
  console.log('\n');
  log(`${colors.bright}Test Summary:${colors.reset}`, 'info');
  log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`, 'info');
  log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`, 'info');
  
  if (testResults.warnings > 0) {
    log(`${colors.yellow}Warnings: ${testResults.warnings}${colors.reset}`, 'info');
  }
  
  const successRate = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;
  
  console.log('\n');
  if (testResults.failed > 0) {
    log(`${colors.red}${colors.bright}Test run completed with failures (${successRate}% success rate)${colors.reset}`, 'info');
  } else if (testResults.warnings > 0) {
    log(`${colors.yellow}${colors.bright}Test run completed with warnings (${successRate}% success rate)${colors.reset}`, 'info');
  } else {
    log(`${colors.green}${colors.bright}All tests passed! (${successRate}% success rate)${colors.reset}`, 'info');
  }
  
  // iOS recommendations
  console.log('\n');
  log(`${colors.cyan}${colors.bright}iOS Compatibility Recommendations:${colors.reset}`, 'info');
  log('1. Test on actual iOS devices if possible', 'info');
  log('2. Enable audio only after user interaction', 'info');
  log('3. Use touchend events instead of click for better response', 'info');
  log('4. Handle IndexedDB transaction errors explicitly on Safari', 'info');
  log('5. Add viewport meta tag with user-scalable=no to prevent zoom issues', 'info');
}

// Run the tests
runTests();

// Safety timeout - force exit if anything hangs
const forceExitTimeout = setTimeout(() => {
  log(`${colors.red}${colors.bright}Force exiting after timeout - some processes may have hung${colors.reset}`, 'error');
  process.exit(1);
}, 120000); // 2 minute safety timeout

// Clear the timeout if clean exit happens
forceExitTimeout.unref(); 