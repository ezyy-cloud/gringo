/**
 * Bot Access Module
 * 
 * Contains methods for accessing bot instances:
 * - Getting a specific bot by ID
 * - Getting all active bots
 */

/**
 * Get a bot by ID
 * @param {Map} activeBots - Reference to the active bots collection
 * @param {String} botId - ID of the bot to get
 * @returns {Object} The bot instance or null if not found
 */
function getBot(activeBots, botId) {
  return activeBots.get(botId) || null;
}

/**
 * Get all active bots
 * @param {Map} activeBots - Reference to the active bots collection
 * @returns {Array} Array of active bot instances with all their data
 */
function getActiveBots(activeBots) {
  // Return all active bot instances
  return Array.from(activeBots.values());
}

module.exports = {
  getBot,
  getActiveBots
}; 