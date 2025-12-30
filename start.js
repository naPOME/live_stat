#!/usr/bin/env node

// Auto-start script for the live ranking system
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Live Ranking System...\n');

// Start the Next.js development server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

console.log('✅ Web server starting at http://localhost:3000');
console.log('📊 Live rankings will be available automatically');
console.log('🔍 Log parser will start when first user visits the site\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Live Ranking System...');
  devServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Live Ranking System...');
  devServer.kill('SIGTERM');
  process.exit(0);
});

// Keep the process running
devServer.on('close', (code) => {
  console.log(`\n🏁 Live Ranking System stopped with code ${code}`);
  process.exit(code);
});

console.log('🎮 Ready for live gaming! Visit http://localhost:3000');
console.log('💡 The log parser will auto-start when you first load the page');
