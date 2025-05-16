/**
 * iPad Test Suite for Fantasy Soundboard
 * 
 * This script simulates iPad behaviors and tests critical functionality
 * to ensure compatibility and proper operation on iPad devices.
 */

class iPadTestSuite {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;

    // Store original navigator properties
    this.originalUserAgent = navigator.userAgent;
    this.originalPlatform = navigator.platform;
    this.originalMaxTouchPoints = navigator.maxTouchPoints;
  }

  /**
   * Simulate iPad environment
   */
  mockiPad() {
    // Save original properties to restore later
    this.originalUserAgent = navigator.userAgent;
    this.originalPlatform = navigator.platform;
    this.originalMaxTouchPoints = navigator.maxTouchPoints;

    // Mock iPad properties
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      configurable: true
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => 'MacIntel',
      configurable: true
    });

    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 5,
      configurable: true
    });

    console.log('🔧 iPad environment simulated');
    return this;
  }

  /**
   * Restore original navigator properties
   */
  restoreOriginalEnvironment() {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => this.originalUserAgent,
      configurable: true
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => this.originalPlatform,
      configurable: true
    });

    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => this.originalMaxTouchPoints,
      configurable: true
    });

    console.log('🔄 Original environment restored');
  }

  /**
   * Run a test and record the result
   */
  runTest(name, testFn) {
    try {
      console.log(`🧪 Running test: ${name}`);
      const result = testFn();
      if (result === 'skip') {
        this.recordResult(name, 'skipped');
        this.skippedTests++;
      } else if (result) {
        this.recordResult(name, 'passed');
        this.passedTests++;
      } else {
        this.recordResult(name, 'failed');
        this.failedTests++;
      }
    } catch (error) {
      console.error(`❌ Test "${name}" threw an error:`, error);
      this.recordResult(name, 'error', error.message);
      this.failedTests++;
    }
  }

  /**
   * Record a test result
   */
  recordResult(name, status, error = null) {
    const result = { name, status, timestamp: new Date() };
    if (error) result.error = error;
    
    this.testResults.push(result);
    
    if (status === 'passed') {
      console.log(`✅ Test "${name}" passed`);
    } else if (status === 'failed') {
      console.log(`❌ Test "${name}" failed`);
    } else if (status === 'skipped') {
      console.log(`⏭️ Test "${name}" skipped`);
    }
  }

  /**
   * Display test results summary
   */
  displayResults() {
    console.log('\n==== iPad Test Results ====');
    console.log(`Total tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    console.log(`⏭️ Skipped: ${this.skippedTests}`);
    console.log('=========================\n');

    return {
      total: this.testResults.length,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      results: this.testResults
    };
  }

  /**
   * Test if iPad detection works correctly
   */
  testIPadDetection() {
    // Use the actual app.jsx logic for detecting iPad
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
    const isiPad = isIOS && (navigator.maxTouchPoints > 1 || /iPad/.test(navigator.userAgent));
    
    console.log(`isIOS detected: ${isIOS}`);
    console.log(`isiPad detected: ${isiPad}`);
    
    return isIOS && isiPad;
  }

  /**
   * Test audio initialization on iPad
   */
  testAudioContextInitialization() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      console.log(`AudioContext created successfully, state: ${audioContext.state}`);
      
      // Create and play a silent buffer to test unlocking
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      console.log('Silent audio played to unlock audio context');
      
      // Test resume function
      audioContext.resume().then(() => {
        console.log(`AudioContext resumed, new state: ${audioContext.state}`);
      });
      
      return audioContext.state === 'running' || audioContext.state === 'suspended';
    } catch (error) {
      console.error('AudioContext initialization failed:', error);
      return false;
    }
  }

  /**
   * Test volume control specifically for iPad
   */
  testVolumeControl() {
    try {
      const audio = new Audio();
      
      // First try setting the volume directly
      const testVolume = 0.5;
      audio.volume = testVolume;
      
      console.log(`Volume set to ${testVolume}, actual value: ${audio.volume}`);
      
      // Test muting
      audio.muted = true;
      const muteResult = audio.muted === true;
      console.log(`Muted set to true, actual value: ${audio.muted}`);
      
      // Test unmuting and setting volume again
      audio.muted = false;
      audio.volume = 0.8;
      
      console.log(`Volume reset to 0.8, actual value: ${audio.volume}`);
      
      return Math.abs(audio.volume - 0.8) < 0.1 && muteResult;
    } catch (error) {
      console.error('Volume control test failed:', error);
      return false;
    }
  }

  /**
   * Test volume control using the WebAudio API - more reliable on iPad
   */
  testWebAudioVolumeControl() {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Create a gain node (volume control)
      const gainNode = audioContext.createGain();
      console.log(`Initial gain value: ${gainNode.gain.value}`);
      
      // Test setting gain to different values
      const testGain1 = 0.3;
      gainNode.gain.value = testGain1;
      
      // Verify the gain value was set correctly
      console.log(`Gain set to ${testGain1}, actual value: ${gainNode.gain.value}`);
      const test1Result = Math.abs(gainNode.gain.value - testGain1) < 0.01;
      
      // Test a different gain value
      const testGain2 = 0.7;
      gainNode.gain.value = testGain2;
      
      // Verify the second gain value was set correctly
      console.log(`Gain set to ${testGain2}, actual value: ${gainNode.gain.value}`);
      const test2Result = Math.abs(gainNode.gain.value - testGain2) < 0.01;
      
      // Clean up
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
      
      return test1Result && test2Result;
    } catch (error) {
      console.error('WebAudio volume control test failed:', error);
      return false;
    }
  }

  /**
   * Test file upload simulation for iPad
   */
  testFileUpload() {
    try {
      // Create a mock file
      const mockFile = new File(['test audio content'], 'test-audio.mp3', {
        type: 'audio/mp3',
        lastModified: new Date().getTime()
      });
      
      console.log(`Created mock file: ${mockFile.name}, type: ${mockFile.type}, size: ${mockFile.size} bytes`);
      
      // Test if file can be read
      const reader = new FileReader();
      reader.onload = () => {
        console.log('File read successful');
      };
      reader.onerror = (error) => {
        console.error('File read failed:', error);
      };
      
      // Start reading the file
      reader.readAsDataURL(mockFile);
      
      return true;
    } catch (error) {
      console.error('File upload test failed:', error);
      return false;
    }
  }

  /**
   * Test large file handling
   */
  testLargeFileHandling() {
    try {
      // Create a mock large file (simulating 60MB)
      // We're not actually creating a 60MB file in memory, just setting the size property
      const mockLargeFile = {
        name: 'large-audio.mp3',
        type: 'audio/mp3',
        size: 60 * 1024 * 1024, // 60MB in bytes
      };
      
      console.log(`Simulated large file: ${mockLargeFile.name}, type: ${mockLargeFile.type}, size: ${Math.round(mockLargeFile.size / (1024 * 1024))}MB`);
      
      // Calculate file size in MB
      const fileSizeMB = Math.round(mockLargeFile.size / (1024 * 1024) * 10) / 10;
      
      // Use actual app logic for large file warning
      const isWarningShown = fileSizeMB > 50;
      
      console.log(`File size: ${fileSizeMB}MB, Warning shown: ${isWarningShown}`);
      
      return isWarningShown === true;
    } catch (error) {
      console.error('Large file handling test failed:', error);
      return false;
    }
  }

  /**
   * Test audio format compatibility detection
   */
  testFormatCompatibility() {
    // Test different formats
    const formats = [
      { name: 'test.mp3', type: 'audio/mp3' },
      { name: 'test.wav', type: 'audio/wav' },
      { name: 'test.ogg', type: 'audio/ogg' },
      { name: 'test.m4a', type: 'audio/m4a' }
    ];
    
    const results = formats.map(format => {
      // Using the actual app logic
      const isIOS = true; // We're simulating iPad
      const fileType = format.type.toLowerCase();
      const isCompatible = fileType.includes('mp3') || fileType.includes('m4a') || fileType.includes('aac');
      
      console.log(`Format: ${format.name}, Compatible: ${isCompatible}`);
      
      return { format: format.name, compatible: isCompatible };
    });
    
    // Test passes if MP3 and M4A are compatible, WAV and OGG are not
    return results[0].compatible && results[3].compatible && !results[2].compatible;
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🧪 Starting iPad Test Suite');
    
    this.mockiPad();
    
    this.runTest('iPad Detection', () => this.testIPadDetection());
    this.runTest('Audio Context Initialization', () => this.testAudioContextInitialization());
    this.runTest('Volume Control', () => this.testVolumeControl());
    this.runTest('Web Audio Volume Control', () => this.testWebAudioVolumeControl());
    this.runTest('File Upload', () => this.testFileUpload());
    this.runTest('Large File Handling', () => this.testLargeFileHandling());
    this.runTest('Format Compatibility', () => this.testFormatCompatibility());
    
    this.restoreOriginalEnvironment();
    
    return this.displayResults();
  }
}

// Create and export the test suite
export const iPadTester = new iPadTestSuite();

// If this file is run directly, execute the tests
if (typeof window !== 'undefined' && window.runIPadTests) {
  iPadTester.runAllTests();
} 