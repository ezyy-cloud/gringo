/**
 * Moderation Service
 * Handles content moderation features
 */
const { logger } = require('../../utils');

// Sample lists of prohibited content - in a real app, these would be more comprehensive 
// and possibly stored in a database
const PROFANITY_LIST = ['badword1', 'badword2', 'badword3'];
const SPAM_PATTERNS = [
  /\b(buy|cheap|discount|free|guarantee|limited|offer|prices|prize|promotion|save|shopping)\b.*\b(now|today|best|only|exclusive|expires|shop|click|buy|order)\b/i,
  /\b(earn|money|cash|dollars|income|profit|opportunity|wealth|rich|financial|freedom)\b.*\b(easy|fast|quick|guaranteed|passive|online|home)\b/i
];

/**
 * Moderate content
 * @param {string} content - Content to moderate
 * @param {string} userId - User ID
 * @param {Object} config - Moderation config
 * @returns {Object} - Moderation result
 */
async function moderateContent(content, userId, config) {
  logger.debug(`Moderating content from user ${userId}`);
  
  const result = {
    original: content,
    moderated: content,
    flags: [],
    actionTaken: false,
    rejected: false
  };
  
  try {
    // Check for profanity
    if (config.profanityFilter && containsProfanity(content)) {
      result.flags.push('profanity');
      result.moderated = filterProfanity(content);
      result.actionTaken = true;
    }
    
    // Check for spam
    if (config.spamDetection && isSpam(content)) {
      result.flags.push('spam');
      
      // If auto-moderation is enabled, reject spam content
      if (config.autoModeration) {
        result.rejected = true;
      }
      
      result.actionTaken = true;
    }
    
    // Apply content warnings if needed
    if (config.contentWarnings) {
      const warnings = getContentWarnings(content);
      
      if (warnings.length > 0) {
        result.flags.push(...warnings);
        result.warnings = warnings;
        result.actionTaken = true;
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error moderating content:', error);
    return {
      ...result,
      error: 'Failed to moderate content',
      actionTaken: false
    };
  }
}

/**
 * Check if content contains profanity
 * @param {string} content - Content to check
 * @returns {boolean} - Whether content contains profanity
 */
function containsProfanity(content) {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some(word => lowerContent.includes(word));
}

/**
 * Filter profanity from content
 * @param {string} content - Content to filter
 * @returns {string} - Filtered content
 */
function filterProfanity(content) {
  let filtered = content;
  
  PROFANITY_LIST.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  
  return filtered;
}

/**
 * Check if content is spam
 * @param {string} content - Content to check
 * @returns {boolean} - Whether content is spam
 */
function isSpam(content) {
  return SPAM_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Get content warnings
 * @param {string} content - Content to check
 * @returns {Array} - Content warnings
 */
function getContentWarnings(content) {
  const warnings = [];
  const lowerContent = content.toLowerCase();
  
  // Check for potentially sensitive topics
  const sensitivePhrases = {
    'violence': ['violent', 'attack', 'fight', 'hurt', 'kill'],
    'politics': ['political', 'election', 'vote', 'democrat', 'republican', 'government'],
    'adult': ['adult content', 'explicit', 'mature']
  };
  
  for (const [category, phrases] of Object.entries(sensitivePhrases)) {
    if (phrases.some(phrase => lowerContent.includes(phrase))) {
      warnings.push(category);
    }
  }
  
  return warnings;
}

module.exports = {
  moderateContent
}; 