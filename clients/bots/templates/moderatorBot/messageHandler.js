/**
 * Moderator Bot - Message Handler
 * Processes incoming messages for the moderator bot
 */
const { logger } = require('../../utils');
const moderationService = require('./moderationService');
const axios = require('axios');

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BOT_API_KEY = process.env.BOT_API_KEY || 'dev-bot-api-key';

/**
 * Process incoming messages
 * @param {Object} message - Message to process
 * @param {Object} bot - Bot instance
 * @returns {Object} - Processing result
 */
async function processMessage(message, bot) {
  logger.debug(`Moderator bot received message from ${message.sender}`);
  
  // Extract the message content and ID
  const content = message.content || message.text || '';
  const messageId = message.id || message.messageId;
  const sender = message.sender || message.username;
  
  // Skip processing if no content or if the message is from the bot itself
  if (!content || sender === bot.username) {
    return { handled: false };
  }
  
  // Check if this is a command for the moderator bot
  if (isModeratorCommand(content)) {
    return handleModeratorCommand(content, sender, bot);
  }
  
  // Moderate the content
  const moderationResult = await bot.moderateContent(content, sender);
  
  // Take action based on moderation result
  if (moderationResult.actionTaken) {
    return handleModerationAction(moderationResult, message, bot);
  }
  
  // Default response if no action needed
  return { handled: false };
}

/**
 * Check if a message is a command for the moderator bot
 * @param {string} content - Message content
 * @returns {boolean} - Whether the message is a moderator command
 */
function isModeratorCommand(content) {
  const lowerContent = content.toLowerCase();
  const commandPrefixes = ['/mod', '/moderate', '/report'];
  
  return commandPrefixes.some(prefix => lowerContent.startsWith(prefix));
}

/**
 * Handle a moderator command
 * @param {string} content - Message content
 * @param {string} sender - Message sender
 * @param {Object} bot - Bot instance
 * @returns {Object} - Handling result
 */
async function handleModeratorCommand(content, sender, bot) {
  const lowerContent = content.toLowerCase();
  
  // Handle report command
  if (lowerContent.startsWith('/report')) {
    const reportContent = content.substring('/report'.length).trim();
    
    if (!reportContent) {
      await bot.sendMessage('To report content, use "/report [message content]"', sender);
      return { handled: true };
    }
    
    // Process the reported content
    await bot.sendMessage('Thank you for your report. A moderator will review it shortly.', sender);
    logger.info(`User ${sender} reported content: ${reportContent}`);
    return { handled: true, reported: true };
  }
  
  // Handle settings command
  if (lowerContent.startsWith('/mod settings')) {
    const settings = formatSettings(bot.config);
    await bot.sendMessage(`Current moderation settings:\n${settings}`, sender);
    return { handled: true };
  }
  
  // Default response for unknown commands
  await bot.sendMessage('Available commands: /report [content], /mod settings', sender);
  return { handled: true };
}

/**
 * Format settings for display
 * @param {Object} config - Moderation config
 * @returns {string} - Formatted settings
 */
function formatSettings(config) {
  return Object.entries(config)
    .map(([key, value]) => `- ${key}: ${value ? 'Enabled' : 'Disabled'}`)
    .join('\n');
}

/**
 * Handle moderation action
 * @param {Object} result - Moderation result
 * @param {Object} message - Original message
 * @param {Object} bot - Bot instance
 * @returns {Object} - Handling result
 */
async function handleModerationAction(result, message, bot) {
  const sender = message.sender || message.username;
  const messageId = message.id || message.messageId;
  
  // If content was rejected, delete the message and notify the sender
  if (result.rejected) {
    // Delete the message via API
    const deleteResult = await deleteMessage(messageId, sender);
    
    if (deleteResult.success) {
      await bot.sendMessage('Your message was deleted by the moderation system for violating our community guidelines.', sender);
      
      // Log the deletion
      logger.info(`Deleted message from ${sender} due to moderation flags: ${result.flags.join(', ')}`);
      
      // Notify all users about the moderation action
      await broadcastModeration(bot, `A message from ${sender} was removed for violating our community guidelines.`);
      
      return { handled: true, moderated: true, rejected: true, deleted: true };
    } else {
      logger.error(`Failed to delete message ${messageId}: ${deleteResult.error}`);
    }
  }
  
  // If content was modified, notify the sender
  if (result.moderated !== result.original) {
    await bot.sendMessage('Your message was flagged by our moderation system. Please review our community guidelines.', sender);
    
    // Log the moderation
    logger.info(`Flagged message from ${sender} with moderation flags: ${result.flags.join(', ')}`);
    
    return { handled: true, moderated: true, modified: true };
  }
  
  // If content has warnings, notify the sender
  if (result.warnings && result.warnings.length > 0) {
    const warningsList = result.warnings.join(', ');
    await bot.sendMessage(`Content advisory: Your message contains potentially sensitive topics (${warningsList}).`, sender);
    return { handled: true, moderated: true, warned: true };
  }
  
  return { handled: true, moderated: true };
}

/**
 * Delete a message via the API
 * @param {string} messageId - ID of the message to delete
 * @param {string} username - Username of the message sender
 * @returns {Object} - Result of the deletion
 */
async function deleteMessage(messageId, username) {
  try {
    // Make API call to delete the message
    const response = await axios({
      method: 'DELETE',
      url: `${API_BASE_URL}/messages/${messageId}`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY
      },
      data: {
        username: username
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Error deleting message:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Broadcast a moderation notification to all users
 * @param {Object} bot - Bot instance
 * @param {string} message - Message to broadcast
 */
async function broadcastModeration(bot, message) {
  try {
    // Use the system message API to broadcast
    await axios({
      method: 'POST',
      url: `${API_BASE_URL}/messages/system`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY
      },
      data: {
        message: message,
        sender: bot.username,
        isSystemMessage: true
      }
    });
    
    logger.debug('Broadcast moderation notification:', message);
  } catch (error) {
    logger.error('Error broadcasting moderation notification:', error.message);
  }
}

module.exports = {
  processMessage
}; 