// Start log parser with the actual log file
const { startParser } = require('./dist/parser');

const logFilePath = 'C:\\Users\\natnaelb\\Downloads\\Telegram Desktop\\log-20251220 (3).txt';

console.log('Starting log parser...');
console.log('Log file:', logFilePath);

startParser({
  filePath: logFilePath,
  pollIntervalMs: 1000, // Check every second
  onEvent: (parsedData) => {
    console.log('✅ Processed event:', {
      GameID: parsedData.GameID,
      playerCount: parsedData.TotalPlayerList?.length || 0,
      teamCount: parsedData.TeamInfoList?.length || 0
    });
  },
  onError: (error) => {
    console.error('❌ Watcher error:', error.message);
  }
});

console.log('Log parser started. Press Ctrl+C to stop.');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nStopping log parser...');
  process.exit(0);
});
