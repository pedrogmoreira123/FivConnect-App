#!/usr/bin/env node

/**
 * Fi.V Connect - Production Environment Test Script
 * 
 * This script allows you to test your Fi.V App in production mode
 * It temporarily sets NODE_ENV=production and starts the server
 * 
 * Usage: node run-production-test.js
 */

const { spawn } = require('child_process');

console.log('🌟 Starting Fi.V App in Production Mode Test...');
console.log('📝 This will show you how the app behaves with production data only');
console.log('🔄 Press Ctrl+C to stop the test and return to development mode');
console.log('');

// Set environment to production and start the server
const server = spawn('tsx', ['server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production'
  },
  stdio: 'inherit'
});

// Handle server exit
server.on('exit', (code) => {
  console.log('');
  console.log('🔧 Production test completed');
  console.log('📝 To return to development mode, run: npm run dev');
  process.exit(code);
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Stopping production test...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});