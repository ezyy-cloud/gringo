/**
 * Moderator Bot - Message Handler
 * Processes incoming messages for the moderator bot
 */
const { logger } = require('../../utils');
const moderationService = require('./moderationService');

/**
 * Process incoming messages
 * @param {Object} message - Message to process
 * @param {Object} bot - Bot instance
 * @returns {Object} - Processing result
 */
async function processMessage(message, bot) {
  logger.debug(`Moderator bot received message from ${message.sender}`, message);
  
  // Extract the message content
  const content = message.content || '';
  
  // Check if this is a command for the moderator bot
  if (isModeratorCommand(content)) {
    return handleModeratorCommand(content, message.sender, bot);
  }
  
  // Moderate the content
  const moderationResult = await bot.moderateContent(content, message.sender);
  
  // Take action based on moderation result
  if (moderationResult.actionTaken) {
    return handleModerationAction(moderationResult, message.sender, bot);
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
 * @param {string} sender - Message sender
 * @param {Object} bot - Bot instance
 * @returns {Object} - Handling result
 */
async function handleModerationAction(result, sender, bot) {
  // If content was rejected, notify the sender
  if (result.rejected) {
    await bot.sendMessage('Your message was blocked by the moderation system. Please review our community guidelines.', sender);
    return { handled: true, moderated: true, rejected: true };
  }
  
  // If content was modified, notify the sender
  if (result.moderated !== result.original) {
    await bot.sendMessage('Your message was modified by the moderation system to comply with our community guidelines.', sender);
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

module.exports = {
  processMessage
}; 