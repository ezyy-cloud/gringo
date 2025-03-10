/**
 * Moderation Service
 * Handles content moderation features
 */
const { logger } = require('../../utils');
const nlp = require('compromise');

// Create a plugin for content moderation
const moderationPlugin = {
  words: {
    fuck: 'Vulgar',
    shit: 'Vulgar',
    ass: 'Vulgar',
    damn: 'Vulgar',
    bitch: 'Vulgar',
    // Slurs
    slur1: 'Slur',
    slur2: 'Slur',
    // Sexual terms
    sex: 'Sexual',
    porn: 'Sexual'
  },
  tags: {
    Vulgar: {
      is: 'Inappropriate'
    },
    Slur: {
      is: 'Inappropriate'
    },
    Sexual: {
      is: 'Inappropriate'
    }
  },
  api: function(Doc) {
    Doc.prototype.hasVulgar = function() {
      let found = this.match('#Vulgar').found;
      return found;
    };

    Doc.prototype.hasSlur = function() {
      let found = this.match('#Slur').found;
      return found;
    };

    Doc.prototype.hasSexual = function() {
      let found = this.match('#Sexual').found;
      return found;
    };

    Doc.prototype.vulgarTerms = function() {
      return this.match('#Vulgar');
    };
  }
};

// Register the plugin
nlp.plugin(moderationPlugin);

// Sample lists of prohibited content patterns
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
    // Check for profanity using compromise
    if (config.profanityFilter) {
      const doc = nlp(content);
      
      // Check for different types of inappropriate content
      const hasVulgar = doc.hasVulgar();
      const hasSlur = doc.hasSlur();
      const hasSexual = doc.hasSexual();
      
      if (hasVulgar || hasSlur || hasSexual) {
        // Add appropriate flags
        if (hasVulgar) result.flags.push('profanity');
        if (hasSlur) result.flags.push('hate_speech');
        if (hasSexual) result.flags.push('sexual_content');
        
        // Get all vulgar terms to filter
        const vulgarTerms = doc.vulgarTerms().out('array');
        
        // Filter the content
        result.moderated = filterProfanity(content, vulgarTerms);
        result.actionTaken = true;
        
        // If content contains slurs and auto-moderation is enabled, reject it
        if (hasSlur && config.autoModeration) {
          result.rejected = true;
        }
        
        // Log the moderation action
        logger.info(`Content moderated for user ${userId}. Flags: ${result.flags.join(', ')}`);
      }
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
 * Filter profanity from content
 * @param {string} content - Content to filter
 * @param {Array} vulgarTerms - List of vulgar terms to filter
 * @returns {string} - Filtered content
 */
function filterProfanity(content, vulgarTerms) {
  let filtered = content;
  
  // If vulgar terms were detected by compromise, filter them
  if (vulgarTerms && vulgarTerms.length > 0) {
    vulgarTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(term.length));
    });
  }
  
  // Also check against our static list for backup
  const PROFANITY_LIST = ['badword1', 'badword2', 'badword3', 'fuck', 'shit', 'ass'];
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
  const doc = nlp(content);
  
  // Check for potentially sensitive topics
  const sensitivePhrases = {
    'violence': ['violent', 'attack', 'fight', 'hurt', 'kill', 'murder', 'assault', 'weapon', 'gun', 'knife'],
    'politics': ['political', 'election', 'vote', 'democrat', 'republican', 'government', 'president', 'congress', 'senate'],
    'adult': ['adult content', 'explicit', 'mature', 'nsfw', 'xxx', 'pornographic'],
    'drugs': ['drug', 'cocaine', 'heroin', 'marijuana', 'weed', 'meth', 'substance abuse'],
    'suicide': ['suicide', 'kill myself', 'end my life', 'self-harm', 'suicidal']
  };
  
  for (const [category, phrases] of Object.entries(sensitivePhrases)) {
    // Create a regex pattern from the phrases
    const pattern = new RegExp(`\\b(${phrases.join('|')})\\b`, 'i');
    if (pattern.test(content)) {
      warnings.push(category);
    }
  }
  
  return warnings;
}

module.exports = {
  moderateContent
}; 