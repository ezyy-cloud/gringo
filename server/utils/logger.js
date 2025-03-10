const winston = require('winston');
const path = require('path');
const fs = require('fs');

console.log('[LOGGER INIT] Initializing logger module');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`[LOGGER INIT] Created logs directory at ${logDir}`);
}

// Define log format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  darkGrey: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Define custom format similar to the bots implementation with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.printf(({ level, message, timestamp }) => {
    const formattedLevel = level.toUpperCase();
    
    // Apply different colors based on log level
    let levelColor;
    switch (level) {
      case 'info':
        levelColor = colors.green;
        break;
      case 'warn':
        levelColor = colors.yellow;
        break;
      case 'error':
        levelColor = colors.red;
        break;
      case 'debug':
        levelColor = colors.blue;
        break;
      default:
        levelColor = colors.reset;
    }
    
    // Apply dark grey to timestamp, appropriate color to level, and reset for message
    return `${colors.darkGrey}[${timestamp}]${colors.reset} ${levelColor}[${formattedLevel}]${colors.reset} ${message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'gringo-server' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Always add console transport with the new format
logger.add(new winston.transports.Console({
  format: consoleFormat,
}));
console.log('[LOGGER INIT] Added console transport to logger');

// Create a simple wrapper for backward compatibility with console.log style calls
// This allows multiple arguments to be passed like console.log
const enhancedLogger = {
  info: (...args) => {
    try {
      if (args.length === 1) {
        logger.info(args[0]);
      } else {
        const formattedMessage = args.map(arg => 
          typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        logger.info(formattedMessage);
      }
    } catch (error) {
      console.error('Error in logger.info():', error);
    }
  },
  
  error: (...args) => {
    try {
      if (args.length === 1) {
        logger.error(args[0]);
      } else {
        const formattedMessage = args.map(arg => 
          typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        logger.error(formattedMessage);
      }
    } catch (error) {
      console.error('Error in logger.error():', error);
    }
  },
  
  warn: (...args) => {
    try {
      if (args.length === 1) {
        logger.warn(args[0]);
      } else {
        const formattedMessage = args.map(arg => 
          typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        logger.warn(formattedMessage);
      }
    } catch (error) {
      console.error('Error in logger.warn():', error);
    }
  },
  
  debug: (...args) => {
    try {
      if (args.length === 1) {
        logger.debug(args[0]);
      } else {
        const formattedMessage = args.map(arg => 
          typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        logger.debug(formattedMessage);
      }
    } catch (error) {
      console.error('Error in logger.debug():', error);
    }
  }
};

// Test the logger directly
console.log('[LOGGER INIT] Testing logger...');
enhancedLogger.info('LOGGER TEST - This is a test info message from logger initialization');

module.exports = enhancedLogger; 