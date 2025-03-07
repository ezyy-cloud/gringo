// Middleware to provide socket.io functionality to routes
const createSocketMiddleware = (io) => {
  // Helper function to notify followers about a new message
  const notifyFollowers = async (userId, username, messageText, messageId) => {
    try {
      // Find the user with their followers populated
      const User = require('../models/User');
      const userWithFollowers = await User.findById(userId);
      
      if (!userWithFollowers || !userWithFollowers.followers || userWithFollowers.followers.length === 0) {
        return; // No followers to notify
      }
      
      // Create notification payload
      const notificationPayload = {
        type: 'newMessage',
        messageId,
        sender: username,
        preview: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
        timestamp: new Date()
      };
      
      // Batch process followers in chunks for better performance with large follower counts
      const BATCH_SIZE = 100;
      const followerIds = userWithFollowers.followers;
      
      // Process followers in batches
      for (let i = 0; i < followerIds.length; i += BATCH_SIZE) {
        const batch = followerIds.slice(i, i + BATCH_SIZE);
        
        // For each follower in this batch
        batch.forEach(followerId => {
          // Emit to room for this follower
          io.to(`user:${followerId}`).emit('newFollowedUserMessage', notificationPayload);
        });
        
        // Small delay between batches to prevent event loop blocking with very large follower counts
        if (followerIds.length > BATCH_SIZE && i + BATCH_SIZE < followerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      // For compatibility with older clients, also emit to sockets that are not in rooms
      // This can be removed in future versions
      io.sockets.sockets.forEach(socket => {
        if (socket.username && socket.userId) {
          const socketUserIdStr = socket.userId.toString();
          
          // Check if this socket belongs to a follower
          const isFollower = followerIds.some(id => id.toString() === socketUserIdStr);
          
          // Only notify if follower and not already in a room
          if (isFollower && !socket.rooms.has(`user:${socketUserIdStr}`)) {
            socket.emit('newFollowedUserMessage', notificationPayload);
          }
        }
      });
    } catch (error) {
      console.error('Error notifying followers:', error);
    }
  };

  // Helper function to broadcast message to clients
  const broadcastMessage = (socketId, messageObj) => {
    if (socketId && socketId !== 'unknown') {
      // Find the sender's socket to use for broadcasting
      const senderSocket = Array.from(io.sockets.sockets.values())
        .find(socket => socket.id === socketId);
      
      if (senderSocket) {
        // If we found the sender's socket, use it to broadcast to everyone else
        senderSocket.broadcast.emit('newMessage', messageObj);
        // Trigger a refresh of messages from the database
        senderSocket.broadcast.emit('refreshMessages');
        console.log('API Message broadcast to all other clients with ID:', messageObj.id);
      } else {
        // Fall back to filtering manually
        io.sockets.sockets.forEach(socket => {
          if (socket.id !== socketId) {
            socket.emit('newMessage', messageObj);
            // Trigger a refresh of messages from the database
            socket.emit('refreshMessages');
          }
        });
        console.log('API Message sent to all other clients by manual filtering with ID:', messageObj.id);
      }
    } else {
      // If no valid socket ID, send to everyone
      io.emit('newMessage', messageObj);
      // Trigger a refresh of messages from the database
      io.emit('refreshMessages');
      console.log('API Message broadcast to all clients with ID:', messageObj.id);
    }
  };

  // Middleware factory that provides the socket.io functionality to the controllers
  return {
    getMessageHandlers: () => {
      const messageController = require('../controllers/messageController');
      
      return {
        // Create a message with the socket.io functionality
        createMessage: (req, res) => {
          return messageController.createMessage(req, res, io, broadcastMessage, notifyFollowers);
        },
        
        // Create a message with an image and the socket.io functionality
        createMessageWithImage: (req, res) => {
          return messageController.createMessageWithImage(req, res, io, broadcastMessage, notifyFollowers);
        }
      };
    },
    
    // Expose notifyFollowers and broadcastMessage for direct use
    notifyFollowers,
    broadcastMessage
  };
};

module.exports = createSocketMiddleware; 