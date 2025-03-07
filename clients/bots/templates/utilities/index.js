/**
 * Bot Utilities
 * 
 * This module exports all utility functions from the utilities folder
 * for easy importing in bot templates.
 */

const apiUtils = require('./apiUtils');
const locationUtils = require('./locationUtils');
const cacheUtils = require('./cacheUtils');

module.exports = {
  ...apiUtils,
  ...locationUtils,
  ...cacheUtils
}; 