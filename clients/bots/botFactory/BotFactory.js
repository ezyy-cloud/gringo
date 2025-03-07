/**
 * Bot Factory Class
 * 
 * The main BotFactory class that orchestrates the management of bot templates and instances.
 * It uses the modular components for template management, bot lifecycle, bot access, and helpers.
 */

// Import components
const templateManager = require('./templateManager');
const botLifecycle = require('./botLifecycle');
const botAccess = require('./botAccess');
const helpers = require('./helpers');

/**
 * BotFactory class for managing bot templates and instances
 */
class BotFactory {
  /**
   * Initialize the BotFactory
   */
  constructor() {
    // Create maps to store bot templates and active bots
    this.botTemplates = new Map();
    this.activeBots = new Map();
    
    console.log('Bot factory initialized');
  }
  
  //==============================================
  // TEMPLATE MANAGEMENT METHODS
  //==============================================
  
  /**
   * Register a new bot template
   * @param {string} type - Template type/name
   * @param {object} template - Template configuration
   */
  registerBotTemplate(type, template) {
    return templateManager.registerBotTemplate(this.botTemplates, type, template);
  }
  
  /**
   * Get a registered bot template
   * @param {string} type - Template type/name
   * @param {boolean} [validate=false] - Whether to validate and throw errors
   * @returns {object|null} The template or null if not found and validate is false
   */
  getBotTemplate(type, validate = false) {
    return templateManager.getBotTemplate(this.botTemplates, type, validate);
  }
  
  /**
   * Get all registered bot templates
   * @returns {Map} Map of bot templates
   */
  getBotTemplates() {
    return templateManager.getBotTemplates(this.botTemplates);
  }
  
  //==============================================
  // BOT ACCESS METHODS
  //==============================================
  
  /**
   * Get a bot by ID
   * @param {String} botId - ID of the bot to get
   * @returns {Object} The bot instance or null if not found
   */
  getBot(botId) {
    return botAccess.getBot(this.activeBots, botId);
  }
  
  /**
   * Get all active bots
   * @returns {Array} Array of active bot instances
   */
  getActiveBots() {
    return botAccess.getActiveBots(this.activeBots);
  }
  
  //==============================================
  // BOT LIFECYCLE METHODS
  //==============================================
  
  /**
   * Initialize a bot from bot data
   * @param {object} botData - Bot configuration data
   * @returns {object} The initialized bot instance
   */
  async initializeBot(botData) {
    return botLifecycle.initializeBot(this.activeBots, this.botTemplates, botData, helpers);
  }
  
  /**
   * Initialize all active bots from the server
   */
  async initializeActiveBots() {
    return botLifecycle.initializeActiveBots(this.activeBots, this.botTemplates, helpers);
  }
  
  /**
   * Shutdown all active bot instances
   */
  shutdownAllBots() {
    return botLifecycle.shutdownAllBots(this.activeBots);
  }
  
  /**
   * Shutdown a bot
   * @param {String} botId - ID of the bot to shutdown
   * @returns {Boolean} True if successful, false otherwise
   */
  shutdownBot(botId) {
    return botLifecycle.shutdownBot(this.activeBots, botId);
  }
  
  /**
   * Start a bot with the specified type and configuration
   * @param {string} type - The type of bot to start
   * @param {object} botData - The bot configuration data
   * @returns {object|null} The bot instance or null if failed
   */
  async startBot(type, botData) {
    try {
      console.log(`Starting bot of type ${type} with ID ${botData._id || botData.id}`);
      
      // Check if a bot with this ID is already active
      const botId = botData._id || botData.id;
      if (this.activeBots.has(botId)) {
        console.log(`Bot ${botId} is already active`);
        return this.activeBots.get(botId);
      }
      
      // Get the template for this bot type
      const template = this.getBotTemplate(type);
      if (!template) {
        console.error(`No template found for bot type: ${type}`);
        return null;
      }
      
      // Initialize the bot using the template
      const bot = await this.initializeBot({
        ...botData,
        type,
        template
      });
      
      if (!bot) {
        console.error(`Failed to initialize bot of type ${type}`);
        return null;
      }
      
      // Add start time to track uptime
      bot.startTime = Date.now();
      
      // Add the bot to active bots
      this.activeBots.set(botId, bot);
      
      console.log(`Bot ${botId} of type ${type} started successfully`);
      return bot;
    } catch (error) {
      console.error(`Error starting bot of type ${type}:`, error);
      return null;
    }
  }
}

module.exports = BotFactory; 