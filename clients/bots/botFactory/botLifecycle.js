/**
 * Bot Lifecycle Module
 * 
 * Contains methods for managing the bot lifecycle:
 * - Initializing bots
 * - Shutting down bots
 */

const { getBotTemplate } = require('./templateManager');

/**
 * Initialize a bot from bot data
 * @param {Map} activeBots - Reference to the active bots collection
 * @param {Map} botTemplates - Reference to the templates collection
 * @param {object} botData - Bot configuration data
 * @param {object} helpers - Helper methods from helpers module
 * @returns {object} The initialized bot instance
 */
async function initializeBot(activeBots, botTemplates, botData, helpers) {
  try {
    // Log a safe copy of botData
    const safeData = {
      _id: botData?._id,
      username: botData?.username,
      email: botData?.email,
      type: botData?.type,
      purpose: botData?.purpose,
      status: botData?.status
    };
    console.log('BotFactory.initializeBot called with:', JSON.stringify(safeData));
    
    // Validate bot data
    helpers.validateBotData(botData);
    
    // Destructure with default values
    const { _id = Date.now().toString(), type, username, config = {} } = botData;
    
    // Log available templates before trying to get the specific one
    console.log(`Looking for template type: "${type}"`);
    console.log('Available template types:', Array.from(botTemplates.keys()));
    
    // Get the bot template with validation
    const template = getBotTemplate(botTemplates, type, true);
    console.log(`Template found for type "${type}":`, {
      name: template.name,
      description: template.description,
      hasInitialize: typeof template.initialize === 'function'
    });
    
    // Retrieve API key if not provided
    let apiKey = botData.apiKey;
    if (!apiKey) {
      apiKey = await helpers.retrieveBotApiKey(_id, username);
    }
    
    // Initialize the bot instance
    console.log(`Initializing bot: ${username} (${_id})`);
    let botInstance = template.initialize({
      ...botData,
      _id,
      apiKey
    });
    
    // Preserve the original data from the server
    if (botData.originalData) {
      botInstance.originalData = botData.originalData;
    } else {
      // If originalData wasn't set, create it now
      botInstance.originalData = { ...botData };
    }
    
    // Ensure required properties exist
    botInstance.id = _id;
    botInstance.username = username;
    botInstance.type = type;
    
    // Enhance bot with common methods and properties
    botInstance = helpers.enhanceBotInstance(
      botInstance, 
      template.config, 
      config, 
      botData.status, 
      apiKey
    );
    
    // Store in active bots map
    activeBots.set(_id, botInstance);
    
    // Connect to socket if bot is active
    if (botInstance.status === 'active' && typeof botInstance.connectToSocketServer === 'function') {
      console.log(`Bot ${username} is active, attempting to connect to socket server...`);
      await helpers.connectBotToSocket(botInstance);
    }
    
    return botInstance;
  } catch (error) {
    console.error('Error initializing bot:', error);
    throw error;
  }
}

/**
 * Initialize all active bots from the server
 * @param {Map} activeBots - Reference to the active bots collection
 * @param {Map} botTemplates - Reference to the bot templates collection
 * @param {Object} helpers - Helper functions
 */
async function initializeActiveBots(activeBots, botTemplates, helpers) {
  try {
    console.log('Initializing active bots...');
    
    // Log available templates
    console.log('AVAILABLE BOT TEMPLATES:');
    for (const [type, template] of botTemplates.entries()) {
      console.log(`- ${type}: ${template.name || type}`);
    }
    
    // Fetch active bots from server
    const bots = await helpers.fetchBotsFromServer();
    console.log(`Retrieved ${bots.length} active bots from server`);
    
    // Log types of bots received
    const botTypes = bots.map(bot => bot.type || 'unknown');
    const uniqueTypes = [...new Set(botTypes)];
    console.log('BOT TYPES FROM SERVER:', uniqueTypes);
    console.log('TYPE DISTRIBUTION:', botTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}));
    
    for (const bot of bots) {
      try {
        // Set default type if missing
        if (!bot.type) {
          console.log(`Bot ${bot._id || bot.id} has no type field, defaulting to 'news'`);
          bot.type = 'news';
        }
        
        // Log if template exists for this bot's type
        const hasTemplate = botTemplates.has(bot.type);
        console.log(`Bot ${bot.username} (${bot.type}): Template exists: ${hasTemplate}`);
        
        await initializeBot(activeBots, botTemplates, bot, helpers);
        console.log(`Successfully initialized bot: ${bot.username} (${bot.type})`);
      } catch (botError) {
        console.error(`Failed to initialize bot ${bot._id || bot.id}:`, botError);
      }
    }
    
    console.log(`Initialized ${bots.length} active bots`);
  } catch (error) {
    console.error('Error initializing active bots:', error);
  }
}

/**
 * Shutdown all active bot instances
 * @param {Map} activeBots - Reference to the active bots collection
 */
function shutdownAllBots(activeBots) {
  console.log('Shutting down all bots...');
  
  // Get a reference to the bots outside the iterator to avoid 
  // issues with modifying the collection during iteration
  const bots = Array.from(activeBots.values());
  
  for (const bot of bots) {
    try {
      if (typeof bot.shutdown === 'function') {
        bot.shutdown();
      }
    } catch (error) {
      console.error(`Error shutting down bot "${bot.username}":`, error);
    }
  }
}

/**
 * Shutdown a bot
 * @param {Map} activeBots - Reference to the active bots collection
 * @param {String} botId - ID of the bot to shutdown
 * @returns {Boolean} True if successful, false otherwise
 */
function shutdownBot(activeBots, botId) {
  try {
    const bot = activeBots.get(botId);
    
    if (!bot) {
      console.warn(`Bot ${botId} not found`);
      return false;
    }
    
    // If the bot has a shutdown method, call it
    if (bot.shutdown && typeof bot.shutdown === 'function') {
      bot.shutdown();
    }
    
    // If the bot has a stop method, call it
    if (bot.stop && typeof bot.stop === 'function') {
      bot.stop();
    }

    // Remove the bot from active bots
    activeBots.delete(botId);
    console.log(`Bot ${botId} shut down`);
    return true;
  } catch (error) {
    console.error(`Error shutting down bot ${botId}:`, error);
    return false;
  }
}

module.exports = {
  initializeBot,
  initializeActiveBots,
  shutdownBot,
  shutdownAllBots
};