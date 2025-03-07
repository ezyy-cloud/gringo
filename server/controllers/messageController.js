const User = require('../models/User');
const Message = require('../models/Message');
const { cloudinary } = require('../utils/cloudinaryConfig');
const streamifier = require('streamifier');

// Helper function to save message to database
const saveMessageToDatabase = async (messageData, userId) => {
  try {
    const { text, sender, timestamp, location, image, messageId } = messageData;
    
    // Log the incoming location data for debugging
    console.log(`Saving message to database with location data:`, location);
    
    // Create a new message with all required fields
    const message = new Message({
      messageId: messageId || Date.now().toString(36) + Math.random().toString(36).substring(2),
      text,
      userId: userId,
      senderUsername: sender, // Ensure senderUsername is set
      timestamp: timestamp || new Date(),
      image,
      isApiMessage: true
    });
    
    // Handle location data properly
    if (location && typeof location === 'object') {
      // Process location data based on its structure
      if (location.latitude && location.longitude) {
        message.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          fuzzyLocation: location.fuzzyLocation !== undefined ? location.fuzzyLocation : true
        };
        console.log(`Location data saved for message: (${location.latitude}, ${location.longitude})`);
      } else if (location.fuzzyLocation) {
        // Handle case where only fuzzyLocation exists but no coordinates
        console.log(`WARNING: Location object exists but missing coordinates. Location data:`, location);
        // Initialize location object with fuzzyLocation only
        message.location = {
          fuzzyLocation: true
        };
      } else if (typeof location === 'string') {
        // If the location was sent as a string (possibly JSON), try to parse it
        try {
          const parsedLocation = JSON.parse(location);
          if (parsedLocation.latitude && parsedLocation.longitude) {
            message.location = {
              latitude: parsedLocation.latitude,
              longitude: parsedLocation.longitude,
              fuzzyLocation: parsedLocation.fuzzyLocation !== undefined ? parsedLocation.fuzzyLocation : true
            };
            console.log(`Parsed location data saved for message: (${parsedLocation.latitude}, ${parsedLocation.longitude})`);
          } else if (parsedLocation.fuzzyLocation) {
            console.log(`WARNING: Parsed location object missing coordinates. Location data:`, parsedLocation);
            message.location = {
              fuzzyLocation: true
            };
          }
        } catch (parseError) {
          console.error('Error parsing location string:', parseError);
        }
      }
    }
    
    await message.save();
    
    // Log confirmation of the saved message with its location
    console.log(`Message saved to database: ${message._id}, Location:`, message.location || 'NO LOCATION');
    
    return message;
  } catch (error) {
    console.error('Error saving message to database:', error);
    throw error;
  }
};

// Create a new message
const createMessage = async (req, res, io, broadcastMessage, notifyFollowers) => {
  const { message, socketId, username, location, messageId: providedMessageId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  console.log('API Message received:', message, 'from socket ID:', socketId, 'User:', username || 'Unknown', 'Location:', location);
  
  // Use provided messageId or create a unique ID for this message
  let messageId = providedMessageId || (Date.now().toString(36) + Math.random().toString(36).substring(2));
  
  // Prepare the message object
  const messageObj = { 
    id: messageId,
    text: message,
    content: message, 
    message: message,
    createdAt: new Date(),
    timestamp: new Date(),
    source: 'api',
    isApiMessage: true,
    senderSocketId: socketId,
    sender: username || 'Unknown User',
    location: location
  };
  
  // Save to database if a username is provided
  let savedMessage = null;
  let userId = null;
  
  if (username) {
    try {
      // Look up the user by username to get their ID
      const user = await User.findOne({ username });
      if (user) {
        userId = user._id;
        savedMessage = await saveMessageToDatabase({
          text: message,
          sender: username,
          messageId: messageId,
          timestamp: new Date(),
          location
        }, userId);
        
        if (savedMessage) {
          messageId = savedMessage._id;
          messageObj.dbId = messageId;
          
          // Add location to the message object for broadcasting if saved properly
          if (savedMessage.location && savedMessage.location.latitude) {
            messageObj.location = {
              latitude: savedMessage.location.latitude,
              longitude: savedMessage.location.longitude,
              fuzzyLocation: savedMessage.location.fuzzyLocation
            };
            console.log(`Broadcasting text message with location: (${messageObj.location.latitude}, ${messageObj.location.longitude})`);
          }
          
          // Notify followers about this new message
          await notifyFollowers(userId, username, message, messageId);
        }
      }
    } catch (error) {
      console.error('Error saving API message to database:', error);
    }
  }
  
  // Broadcast the message to clients
  broadcastMessage(socketId, messageObj);
  
  return res.status(201).json({ 
    success: true, 
    message: 'Message sent', 
    messageId,
    dbId: savedMessage ? savedMessage._id : null 
  });
};

// Create a message with an image
const createMessageWithImage = async (req, res, io, broadcastMessage, notifyFollowers) => {
  try {
    const { message, socketId, username, location: rawLocation, messageId: providedMessageId } = req.body;
    
    // Process location data - it might be a string from FormData
    let location = rawLocation;
    if (typeof rawLocation === 'string') {
      try {
        location = JSON.parse(rawLocation);
        console.log('Parsed location from string:', location);
      } catch (err) {
        console.error('Failed to parse location string:', rawLocation, err);
      }
    }
    
    // Log detailed information about the location data
    console.log('Image upload received with location data:', {
      rawLocation,
      parsedLocation: location,
      hasCoordinates: location && location.latitude && location.longitude ? 'YES' : 'NO',
      fuzzyLocation: location && location.fuzzyLocation ? 'YES' : 'NO'
    });
    
    // Check if an image file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    // Add detailed logging of image properties before uploading
    console.log('Image upload details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length,
      bufferStart: req.file.buffer.length > 20 ? req.file.buffer.toString('hex', 0, 20) + '...' : req.file.buffer.toString('hex')
    });
    
    console.log('Image upload received:', req.file.originalname, 'from socket ID:', socketId, 'User:', username || 'Unknown');
    
    // Upload the image to Cloudinary
    let result;
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'gringo_messages',
          resource_type: 'image',
          format: 'jpg',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        async (error, uploadResult) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            console.error('Cloudinary detailed error info:', JSON.stringify(error, null, 2));
            return res.status(500).json({ error: 'Image upload failed', details: error });
          }
          
          // Use provided messageId or create a unique ID for this message
          let messageId = providedMessageId || (Date.now().toString(36) + Math.random().toString(36).substring(2));
          
          // Prepare the message object
          const messageObj = { 
            id: messageId,
            text: message || '',
            content: message || '',
            message: message || '',
            createdAt: new Date(),
            timestamp: new Date(),
            source: 'api',
            isApiMessage: true,
            senderSocketId: socketId,
            sender: username || 'Unknown User',
            location: location,
            image: uploadResult.secure_url,
            imagePublicId: uploadResult.public_id
          };
          
          // Log the message object with location before saving
          console.log('About to save message with location data:', {
            hasLocation: location ? 'YES' : 'NO',
            hasCoordinates: location && location.latitude && location.longitude ? 'YES' : 'NO',
            locationData: location
          });
          
          // Save to database if a username is provided
          let savedMessage = null;
          let userId = null;
          
          if (username) {
            try {
              // Find the user
              const user = await User.findOne({ username });
              if (user) {
                userId = user._id;
                
                // Save message to database
                savedMessage = await saveMessageToDatabase({
                  text: message || '',
                  sender: username,
                  messageId: messageId,
                  timestamp: new Date(),
                  location,
                  image: uploadResult.secure_url
                }, userId);
                
                if (savedMessage) {
                  messageObj.dbId = savedMessage._id;
                  
                  // Add location to the message object for broadcasting if saved properly
                  if (savedMessage.location && savedMessage.location.latitude) {
                    messageObj.location = {
                      latitude: savedMessage.location.latitude,
                      longitude: savedMessage.location.longitude,
                      fuzzyLocation: savedMessage.location.fuzzyLocation
                    };
                    console.log(`Broadcasting message with location: (${messageObj.location.latitude}, ${messageObj.location.longitude})`);
                  }
                  
                  // Notify followers
                  await notifyFollowers(userId, username, message, messageId, uploadResult.secure_url);
                }
              }
            } catch (error) {
              console.error('Error saving image message to database:', error);
            }
          }
          
          // Broadcast the message to clients
          broadcastMessage(socketId, messageObj);
          
          return res.status(201).json({ 
            success: true, 
            message: 'Message with image sent', 
            messageId,
            dbId: savedMessage ? savedMessage._id : null,
            imageUrl: uploadResult.secure_url
          });
        }
      );
      
      // Try adding a try/catch block around the stream creation
      try {
        // Convert buffer to readable stream and pipe to cloudinary
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      } catch (streamError) {
        console.error('Error creating stream for Cloudinary upload:', streamError);
        return res.status(500).json({ error: 'Failed to process image stream', details: streamError.message });
      }
    } catch (uploadError) {
      console.error('Error uploading to Cloudinary:', uploadError);
      return res.status(500).json({ error: 'Image upload failed', details: uploadError.message });
    }
  } catch (error) {
    console.error('Error processing message with image:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Get messages from a specific user
const getUserMessages = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUsername = req.query.currentUser; // Get the current user from query params
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Find the user first to get their ID
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`Fetching messages for user: ${username}, current user: ${currentUsername || 'none'}`);
    
    // Get messages from this user using the userId field
    const messages = await Message.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'username profilePicture'
      });
    
    // Get total count for pagination
    const total = await Message.countDocuments({ userId: user._id });
    
    // If currentUsername is provided, check which messages are liked by the current user
    let processedMessages = messages;
    if (currentUsername) {
      const currentUser = await User.findOne({ username: currentUsername });
      if (currentUser) {
        const likedMessageIds = currentUser.likedMessages.map(id => id.toString());
        processedMessages = messages.map(msg => {
          const msgObject = msg.toObject();
          msgObject.likedByCurrentUser = likedMessageIds.includes(msg._id.toString());
          
          // Add author field with username and profilePicture fields for better client compatibility
          msgObject.author = {
            username: msg.userId ? msg.userId.username : username,
            profilePicture: msg.userId ? msg.userId.profilePicture : null
          };
          
          return msgObject;
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        messages: processedMessages,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user messages',
      error: error.message
    });
  }
};

// Get all messages
const getAllMessages = async (req, res) => {
  try {
    const { exclude: excludeUsername, currentUser } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    console.log(`Getting all messages. Exclude: ${excludeUsername || 'none'}, Current user: ${currentUser || 'none'}`);
    
    // Prepare query - if excludeUsername is provided, find that user and exclude their messages
    let query = {};
    if (excludeUsername) {
      const userToExclude = await User.findOne({ username: excludeUsername });
      if (userToExclude) {
        query.userId = { $ne: userToExclude._id };
      }
    }
    
    // Get messages with userId field populated
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profilePicture');
    
    // Get total count for pagination
    const total = await Message.countDocuments(query);
    
    // If currentUser is provided, check which messages are liked by the current user
    let processedMessages = messages;
    if (currentUser) {
      const user = await User.findOne({ username: currentUser });
      if (user) {
        const likedMessageIds = user.likedMessages.map(id => id.toString());
        processedMessages = messages.map(msg => {
          const msgObject = msg.toObject();
          msgObject.likedByCurrentUser = likedMessageIds.includes(msg._id.toString());
          return msgObject;
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      messages: processedMessages,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Like a message
const likeMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user; // Use the authenticated user from middleware
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Find the user who is liking the message
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the message to like/unlike
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user already liked this message
    const alreadyLiked = user.likedMessages.some(
      msgId => msgId.toString() === id
    );
    
    let liked = false;
    
    // Toggle like status
    if (alreadyLiked) {
      // Unlike: Remove message from user's liked messages
      const likedIndex = user.likedMessages.findIndex(
        msgId => msgId.toString() === id
      );
      
      if (likedIndex !== -1) {
        user.likedMessages.splice(likedIndex, 1);
        await user.save();
        
        // Update likes array on message
        const userIdStr = user._id.toString();
        const likeIndex = message.likes.findIndex(userId => 
          userId.toString() === userIdStr
        );
        
        if (likeIndex !== -1) {
          message.likes.splice(likeIndex, 1);
          await message.save();
        }
      }
      
      liked = false;
    } else {
      // Like: Add message to user's liked messages
      user.likedMessages.push(id);
      await user.save();
      
      // Add user to message's likes array
      if (!message.likes.includes(user._id)) {
        message.likes.push(user._id);
        await message.save();
      }
      
      liked = true;
    }
    
    console.log(`User ${username} ${liked ? 'liked' : 'unliked'} message ${id}`);
    
    // Get the updated likes count
    const likesCount = message.likes.length;
    
    return res.status(200).json({
      success: true,
      message: liked ? 'Message liked' : 'Message unliked',
      liked,
      likesCount,
      messageId: id,
      likedByUsername: liked ? username : null,
      unlikedByUsername: !liked ? username : null
    });
  } catch (error) {
    console.error('Error toggling message like:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Unlike a message
const unlikeMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Find the user who is unliking the message
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the message to unlike
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user has liked this message
    const likedIndex = user.likedMessages.findIndex(
      msgId => msgId.toString() === id
    );
    
    if (likedIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Message not liked'
      });
    }
    
    // Remove message from user's liked messages
    user.likedMessages.splice(likedIndex, 1);
    await user.save();
    
    // Decrement like count on the message
    if (message.likes > 0) {
      message.likes -= 1;
      await message.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message unliked',
      data: {
        likeCount: message.likes
      }
    });
  } catch (error) {
    console.error('Error unliking message:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Find the user
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the message
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if this user is the owner of the message or an admin
    const isOwner = message.user && message.user.toString() === user._id.toString();
    const isAdmin = user.isAdmin;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Delete message
    await Message.findByIdAndDelete(id);
    
    // If message had an image, delete it from Cloudinary
    if (message.image && message.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(message.imagePublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Continue with message deletion even if image deletion fails
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createMessage,
  createMessageWithImage,
  getUserMessages,
  getAllMessages,
  likeMessage,
  unlikeMessage,
  deleteMessage,
  saveMessageToDatabase
}; 