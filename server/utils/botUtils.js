/**
 * Bot utility functions and constants
 * Used to centralize bot-related constants and helper functions
 */

// Valid bot types - must match templates available in the bot service
exports.VALID_BOT_TYPES = ['news', 'weather', 'moderator'];

// Valid bot statuses
exports.VALID_BOT_STATUSES = ['active', 'inactive', 'suspended', 'pending'];

// Get bot types with labels for UI display
exports.getBotTypesForUI = () => {
  return [
    { value: 'news', label: 'News Bot' },
    { value: 'weather', label: 'Weather Bot' },
    { value: 'moderator', label: 'Moderator Bot' }
  ];
};

// Validate if a bot type is valid
exports.isValidBotType = (type) => {
  return exports.VALID_BOT_TYPES.includes(type);
};

// Get default capabilities for a bot type
exports.getDefaultCapabilitiesForType = (type) => {
  switch (type) {
    case 'news':
      return ['messaging'];
    case 'weather':
      return ['messaging'];
    case 'moderator':
      return ['messaging', 'moderation', 'content-analysis'];
    default:
      return ['messaging'];
  }
}; 