/**
 * Weather Bot - Message Handler
 * Processes incoming messages for the weather bot
 */
const { logger } = require('../../utils');
const weatherService = require('./weatherService');

/**
 * Process incoming messages
 * @param {Object} message - Message to process
 * @param {Object} bot - Bot instance
 * @returns {Object} - Processing result
 */
async function processMessage(message, bot) {
  logger.debug(`Weather bot received message from ${message.sender}`, message);
  
  // Extract the message content
  const content = message.content || '';
  
  // Check if the message is asking about weather
  if (isWeatherQuery(content)) {
    return handleWeatherQuery(content, message.sender, bot);
  }
  
  // Default response for non-weather queries
  await bot.sendMessage('Ask me about the weather in any location! For example, "What\'s the weather in New York?"', message.sender);
  return { handled: true };
}

/**
 * Check if a message is asking about weather
 * @param {string} content - Message content
 * @returns {boolean} - Whether the message is a weather query
 */
function isWeatherQuery(content) {
  const lowerContent = content.toLowerCase();
  const weatherKeywords = ['weather', 'temperature', 'forecast', 'rain', 'snow', 'sunny', 'cloudy'];
  
  return weatherKeywords.some(keyword => lowerContent.includes(keyword));
}

/**
 * Handle a weather query message
 * @param {string} content - Message content
 * @param {string} sender - Message sender
 * @param {Object} bot - Bot instance
 * @returns {Object} - Handling result
 */
async function handleWeatherQuery(content, sender, bot) {
  try {
    // Get weather information from the service
    const weatherInfo = await weatherService.getWeatherForLocation(content);
    
    // Construct response message
    let response;
    
    if (weatherInfo.success) {
      const { location, weather } = weatherInfo;
      response = `The weather in ${location} is currently ${weather.condition} with a temperature of ${weather.temperature}°F. ` +
                `Humidity is ${weather.humidity}% with wind speed of ${weather.wind} mph. ${weather.forecast}`;
    } else {
      response = `${weatherInfo.error}. I can provide weather for specific locations like "New York" or "Paris".`;
    }
    
    // Send the response
    await bot.sendMessage(response, sender);
    return { handled: true };
    
  } catch (error) {
    logger.error('Error handling weather query:', error);
    await bot.sendMessage('Sorry, I encountered an error while checking the weather. Please try again later.', sender);
    return { handled: false, error: error.message };
  }
}

module.exports = {
  processMessage
}; 