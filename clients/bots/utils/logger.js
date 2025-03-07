/**
 * Logger Utility
 */
const config = require('../config');

// Log levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Current log level from config
const CURRENT_LEVEL = LOG_LEVELS[config.LOG_LEVEL || 'info'];

/**
 * Format a log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 * @returns {string} - Formatted log message
 */
function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
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