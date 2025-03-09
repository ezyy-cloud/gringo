/**
 * API Fallbacks
 * 
 * This file contains fallback responses for API endpoints when the server is unreachable.
 * It allows the app to function in offline mode with mock data.
 */

// Default fallback response for status endpoints
export const getStatusFallback = () => {
  return {
    success: true,
    message: 'API fallback mode active',
    status: 'offline',
    timestamp: Date.now()
  };
};

// Fallback for messages when API is unreachable
export const getMessagesFallback = () => {
  // Try to get cached messages from localStorage
  try {
    const cachedMessages = localStorage.getItem('cachedMessages');
    if (cachedMessages) {
      const messages = JSON.parse(cachedMessages);
      
      // Filter out messages older than 30 minutes
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      const recentMessages = messages.filter(msg => 
        new Date(msg.timestamp || msg.createdAt).getTime() > thirtyMinutesAgo
      );
      
      return {
        success: true,
        messages: recentMessages,
        source: 'cache',
        count: recentMessages.length
      };
    }
  } catch (error) {
    console.error('Error retrieving cached messages:', error);
  }
  
  // If no cached messages, return empty array
  return {
    success: true,
    messages: [],
    source: 'fallback',
    count: 0
  };
};

// Cache messages for offline use
export const cacheMessages = (messages) => {
  try {
    localStorage.setItem('cachedMessages', JSON.stringify(messages));
    console.log(`Cached ${messages.length} messages for offline use`);
  } catch (error) {
    console.error('Error caching messages:', error);
  }
}; 