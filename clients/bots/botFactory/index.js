/**
 * BotFactory - Main Entry Point
 * 
 * This file is responsible for exporting the singleton instance of the BotFactory,
 * which is the primary API for interacting with bot templates and instances.
 */

const BotFactory = require('./BotFactory');

// Create a singleton instance of the BotFactory
const botFactory = new BotFactory();

// Export the singleton instance
module.exports = botFactory; 