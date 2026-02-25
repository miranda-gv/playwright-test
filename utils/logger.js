// Simple logging utility with timestamps and log levels
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

function getTimestamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (!LOG_LEVELS.includes(level)) level = 'info';
  // Only log if level is enabled (can add filtering logic here)
  console.log(`[${getTimestamp()}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
  log, // generic
};
