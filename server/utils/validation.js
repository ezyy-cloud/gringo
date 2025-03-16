// Validate API keys based on format
exports.validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // AISStream.io API keys are typically long alphanumeric strings
  // This is a more specific validation for AISStream API keys
  // Regex pattern: Alphanumeric characters, at least 32 characters long
  const aisStreamKeyPattern = /^[a-zA-Z0-9]{32,}$/;
  
  if (!aisStreamKeyPattern.test(apiKey)) {
    console.warn('API key failed validation check. Should be at least 32 alphanumeric characters.');
    return false;
  }
  
  return true;
};

// Export any existing functions
module.exports = exports; 