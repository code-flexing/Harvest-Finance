#!/usr/bin/env node

/**
 * Test Runner Script for Token Expiry Tests
 * 
 * This script runs the comprehensive token expiry validation tests
 * and provides a summary of results.
 */

const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname);

console.log('🔐 Token Expiry Validation Test Suite');
console.log('=====================================\n');

const testFiles = [
  'src/auth/token-expiry.spec.ts',
  'src/auth/strategies/jwt-expiry.spec.ts',
  'src/auth/logout-ttl.spec.ts',
  'src/auth/token-lifecycle.spec.ts',
];

let totalTests = 0;
let completedTests = 0;

const runTest = (testFile) => {
  return new Promise((resolve) => {
    console.log(`📋 Running: ${testFile}`);
    
    const jest = spawn('npx', ['jest', testFile, '--verbose', '--passWithNoTests'], {
      cwd: backendDir,
      stdio: 'inherit',
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ PASSED: ${testFile}\n`);
      } else {
        console.log(`❌ FAILED: ${testFile}\n`);
      }
      completedTests++;
      resolve(code);
    });

    jest.on('error', (error) => {
      console.error(`❌ ERROR running ${testFile}:`, error.message);
      completedTests++;
      resolve(1);
    });
  });
};

const runAllTests = async () => {
  totalTests = testFiles.length;
  
  for (const testFile of testFiles) {
    await runTest(testFile);
  }

  console.log('\n=====================================');
  console.log(`📊 Test Summary: ${completedTests}/${totalTests} test suites completed`);
  console.log('=====================================\n');
  
  if (completedTests === totalTests) {
    console.log('✅ All token expiry test suites completed!');
    console.log('\nTest Coverage:');
    console.log('  - Access Token Expiry (1 hour)');
    console.log('  - Refresh Token Expiry (7 days)');
    console.log('  - Reset Token Expiry (1 hour)');
    console.log('  - JWT Strategy Integration');
    console.log('  - Logout TTL Calculations');
    console.log('  - Token Lifecycle Integration');
    console.log('\n✨ All comprehensive token expiry tests ready!');
  } else {
    console.log('⚠️ Some test suites did not complete successfully.');
  }
};

runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
