/**
 * Logger Utility
 */
const config = require('../config');

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Log levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Current log level from config
const CURRENT_LEVEL = LOG_LEVELS[config.LOG_LEVEL || 'info'];

// Color mapping for log levels
const LEVEL_COLORS = {
  debug: COLORS.cyan,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red
};

/**
 * Format a log message with colors
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {string} - Formatted log message with colors
 */
function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const levelColor = LEVEL_COLORS[level] || COLORS.white;
  const prefix = `${COLORS.dim}[${timestamp}]${COLORS.reset} ${levelColor}[${level.toUpperCase()}]${COLORS.reset}`;
  
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Logger object with methods for each log level
 */
const logger = {
  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug: (message, data) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) {
      console.log(formatLog('debug', message, data));
    }
  },
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info: (message, data) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) {
      console.log(formatLog('info', message, data));
    }
  },
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn: (message, data) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, data));
    }
  },
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object|Error} error - Error object or additional data
   */
  error: (message, error) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) {
      if (error instanceof Error) {
        console.error(formatLog('error', message, {
          message: error.message,
          stack: error.stack
        }));
      } else {
        console.error(formatLog('error', message, error));
      }
    }
  }
};

module.exports = logger; 