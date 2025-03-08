/**
 * Helper function to create a notification from socket data
 * @param {Object} data - Socket data
 * @returns {Object|null} Notification object or null
 */
export const createNotification = (data) => {
  // Skip system messages
  if (data.sender === 'System' || data.sender === 'Server') {
    return null; // Return null to indicate no notification was created
  }
  
  return {
    id: Date.now(),
    sender: data.sender,
    preview: data.messagePreview,
    timestamp: data.timestamp || new Date(),
    read: false,
    type: 'message', // Default type
    data: data // Store original data
  };
}; 