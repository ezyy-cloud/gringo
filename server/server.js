require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const multer = require('multer');
const { cloudinary } = require('./utils/cloudinaryConfig');
const streamifier = require('streamifier');

// Import models
const User = require('./models/User');
const Message = require('./models/Message');

// Import routes
const authRoutes = require('./routes/authRoutes');
const { protect } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Redis client
const redisClient = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'Gu6q6e9e2fSoA8FrTpRzKSVn7GdDpsqG',
  socket: {
    host: process.env.REDIS_HOST || 'redis-15888.c341.af-south-1-1.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '15888'),
    reconnectStrategy: (retries) => {
      // Exponential backoff: 2^retries * 100ms (capped at 10s)
      return Math.min(Math.pow(2, retries) * 100, 10000);
    }
  }
});

// Create a duplicate Redis client for Socket.IO adapter
const redisClientForSocketIO = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'Gu6q6e9e2fSoA8FrTpRzKSVn7GdDpsqG',
  socket: {
    host: process.env.REDIS_HOST || 'redis-15888.c341.af-south-1-1.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '15888'),
    reconnectStrategy: (retries) => {
      // Exponential backoff: 2^retries * 100ms (capped at 10s)
      return Math.min(Math.pow(2, retries) * 100, 10000);
    }
  }
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    await redisClientForSocketIO.connect();
    console.log('Redis clients connected');
    
    // Set up error handling
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
    
    redisClientForSocketIO.on('error', (err) => {
      console.error('Redis Socket.IO adapter error:', err);
    });
  } catch (error) {
    console.error('Redis connection error:', error);
    // Continue without Redis if it's not available
    console.log('Continuing without Redis caching and Socket.IO scaling');
  }
})();

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not connected
    if (!redisClient.isReady) {
      console.log('Redis not ready, skipping cache');
      return next();
    }
    
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create a unique key based on the request URL and query parameters
    const key = `cache:${req.originalUrl}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(key);
      
      if (cachedResponse) {
        // If found, send the cached response
        const parsedResponse = JSON.parse(cachedResponse);
        res.json(parsedResponse);
        return;
      }
      
      // If not found, replace res.json with a custom implementation
      // that will cache the response before sending it
      const originalJson = res.json;
      res.json = function(body) {
        // Cache the response
        redisClient.setEx(key, duration, JSON.stringify(body))
          .catch(err => {
            console.error('Redis cache set error:', err);
            // Continue without caching
          });
        
        // Call the original json method
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Redis cache error:', error);
      // Continue without caching if there's an error
      next();
    }
  };
};

// Cache invalidation helper
const invalidateCache = async (patterns) => {
  // Skip if Redis is not connected
  if (!redisClient.isReady) {
    console.log('Redis not ready, skipping cache invalidation');
    return;
  }
  
  try {
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    
    for (const pattern of patterns) {
      try {
        // Use SCAN to find keys matching the pattern
        let cursor = 0;
        do {
          const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
          cursor = result.cursor;
          
          // Delete all found keys
          if (result.keys.length > 0) {
            await redisClient.del(result.keys);
            console.log(`Invalidated ${result.keys.length} cache keys matching: ${pattern}`);
          }
        } while (cursor !== 0);
      } catch (patternError) {
        console.error(`Error scanning for pattern ${pattern}:`, patternError);
        // Continue with next pattern
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
    // Just log the error and continue - don't let cache issues break the app
  }
};

// Configure CORS for Express
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

// More strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Apply rate limiting to all API routes
app.use('/api/', (req, res, next) => {
  // Skip rate limiting in development mode for localhost
  if (process.env.NODE_ENV === 'development' && 
      (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
    return next();
  }
  
  // Apply rate limiting for non-development environments
  apiLimiter(req, res, next);
});

// Apply stricter rate limiting to auth routes
app.use('/api/auth/', (req, res, next) => {
  // Skip rate limiting in development mode for localhost
  if (process.env.NODE_ENV === 'development' && 
      (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
    return next();
  }
  
  // Apply rate limiting for non-development environments
  authLimiter(req, res, next);
});

// Initialize Socket.IO with more detailed CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Set up Redis adapter for Socket.IO if Redis is connected
(async () => {
  try {
    if (redisClient.isReady && redisClientForSocketIO.isReady) {
      // Create and set the Redis adapter
      const pubClient = redisClient;
      const subClient = redisClientForSocketIO;
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter enabled for horizontal scaling');
    }
  } catch (error) {
    console.error('Error setting up Socket.IO Redis adapter:', error);
    console.log('Continuing with default in-memory adapter');
  }
})();

// Connect to MongoDB with optimized connection pooling
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Set up connection monitoring
const db = mongoose.connection;

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

db.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// Create indexes on startup to ensure they exist
db.once('open', async () => {
  console.log('MongoDB connection opened');
  
  try {
    // Check and fix any documents with null messageId before creating unique index
    const messagesWithNullId = await Message.find({ messageId: null });
    console.log(`Found ${messagesWithNullId.length} messages with null messageId`);
    
    // Update any messages with null messageId to have a unique generated ID
    for (const message of messagesWithNullId) {
      const generatedId = `legacy-${message._id.toString()}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      await Message.updateOne(
        { _id: message._id },
        { $set: { messageId: generatedId } }
      );
      console.log(`Updated message ${message._id} with generated messageId: ${generatedId}`);
    }
    
    // Ensure Message indexes exist
    await Message.collection.createIndex({ messageId: 1 }, { unique: true });
    await Message.collection.createIndex({ userId: 1, createdAt: -1 });
    await Message.collection.createIndex({ 'location.longitude': 1, 'location.latitude': 1 });
    
    // Ensure User indexes exist
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ isOnline: 1, lastSeen: -1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't prevent the server from starting due to index creation issues
    console.log('Server will continue running despite index creation error');
  }
});

// API Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Express API with Socket.IO integration' });
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// User routes
app.get('/api/users/:username', cache(60), async (req, res) => {
  try {
    const { username } = req.params;
    const { currentUsername } = req.query; // Optional: get the current user to check follow status
    
    const user = await User.findOne({ username }).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create the response data with follower/following counts
    const responseData = {
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      coverColor: user.coverColor,
      bio: user.bio,
      darkMode: user.darkMode,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      likedMessages: user.likedMessages,
      isFollowing: false
    };
    
    // If we have a current username, check if they're following this user
    if (currentUsername && currentUsername !== username) {
      const currentUser = await User.findOne({ username: currentUsername });
      if (currentUser) {
        // Check if currentUser is following the requested user
        responseData.isFollowing = currentUser.following.some(id => 
          id.toString() === user._id.toString()
        );
      }
    }

    // Return user data
    return res.status(200).json({
      success: true,
      data: {
        user: responseData
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Follow a user
app.post('/api/users/:username/follow', async (req, res) => {
  try {
    const { username } = req.params;
    const { currentUsername } = req.body;

    // Validate input
    if (!currentUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current user is required' 
      });
    }

    // Get both users with a single query
    const [userToFollow, currentUser] = await Promise.all([
      User.findOne({ username }).select('_id username followers'),
      User.findOne({ username: currentUsername }).select('_id username following')
    ]);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Prevent self-following
    if (userToFollow._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if already following - using String comparison for ObjectIDs
    const isAlreadyFollowing = currentUser.following.some(id => 
      id.toString() === userToFollow._id.toString()
    );
    
    if (isAlreadyFollowing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already following this user' 
      });
    }

    // Use atomic operations to update both users
    // This helps prevent race conditions when multiple follow requests happen simultaneously
    const [updatedCurrentUser, updatedUserToFollow] = await Promise.all([
      // Add userToFollow to current user's following list
      User.findOneAndUpdate(
        { 
          _id: currentUser._id,
          // Extra check to prevent duplicate follows if there's a race condition
          following: { $ne: userToFollow._id }
        },
        { 
          $addToSet: { following: userToFollow._id }
        },
        { new: true }
      ),
      
      // Add current user to userToFollow's followers list
      User.findOneAndUpdate(
        { 
          _id: userToFollow._id,
          // Extra check to prevent duplicate follows if there's a race condition
          followers: { $ne: currentUser._id }
        },
        { 
          $addToSet: { followers: currentUser._id }
        },
        { new: true }
      )
    ]);
    
    // Verify that both updates were successful
    if (!updatedCurrentUser || !updatedUserToFollow) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update follow relationship'
      });
    }

    // Invalidate relevant cache entries
    await invalidateCache([
      `cache:/api/users/${username}*`,
      `cache:/api/users/${currentUsername}*`
    ]);

    return res.status(200).json({
      success: true,
      message: `Now following ${username}`,
      data: {
        followersCount: updatedUserToFollow.followers.length,
        followingCount: updatedUserToFollow.following.length
      }
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Unfollow a user
app.post('/api/users/:username/unfollow', async (req, res) => {
  try {
    const { username } = req.params;
    const { currentUsername } = req.body;

    // Validate input
    if (!currentUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current user is required' 
      });
    }

    // Get both users with a single query for efficiency
    const [userToUnfollow, currentUser] = await Promise.all([
      User.findOne({ username }).select('_id username followers'),
      User.findOne({ username: currentUsername }).select('_id username following')
    ]);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if actually following - using String comparison for ObjectIDs
    const isFollowing = currentUser.following.some(id => 
      id.toString() === userToUnfollow._id.toString()
    );
    
    if (!isFollowing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not following this user' 
      });
    }

    // Use atomic operations to update both users
    // This helps prevent race conditions when multiple unfollow requests happen simultaneously
    const [updatedCurrentUser, updatedUserToUnfollow] = await Promise.all([
      // Remove userToUnfollow from current user's following list
      User.findOneAndUpdate(
        { _id: currentUser._id },
        { $pull: { following: userToUnfollow._id } },
        { new: true }
      ),
      
      // Remove current user from userToUnfollow's followers list
      User.findOneAndUpdate(
        { _id: userToUnfollow._id },
        { $pull: { followers: currentUser._id } },
        { new: true }
      )
    ]);
    
    // Verify that both updates were successful
    if (!updatedCurrentUser || !updatedUserToUnfollow) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update follow relationship'
      });
    }

    // Invalidate relevant cache entries
    await invalidateCache([
      `cache:/api/users/${username}*`,
      `cache:/api/users/${currentUsername}*`
    ]);

    return res.status(200).json({
      success: true,
      message: `No longer following ${username}`,
      data: {
        followersCount: updatedUserToUnfollow.followers.length,
        followingCount: updatedUserToUnfollow.following.length
      }
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// API endpoint examples
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Configure multer for in-memory storage (no temp files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Cloudinary upload stream
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: "gringo_messages",
        resource_type: "image" 
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Post a message with image
app.post('/api/messages/with-image', protect, upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    
    // Parse location data if it exists
    let locationData = null;
    if (req.body.location) {
      try {
        locationData = JSON.parse(req.body.location);
      } catch (error) {
        console.error('Error parsing location data:', error);
      }
    }
    
    // Get fuzzy location preference (defaults to true for privacy)
    const useFuzzyLocation = req.body.fuzzyLocation !== 'false';
    
    // Add fuzzy location flag to location data
    if (locationData) {
      locationData.fuzzyLocation = useFuzzyLocation;
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }
    
    // Upload image to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    
    // Create a unique ID for this message
    const messageId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Save message with image URL to database
    const savedMessage = await saveMessageToDatabase({
      text: message,
      sender: username,
      timestamp: new Date(),
      location: locationData,
      image: cloudinaryResult.secure_url
    }, userId);
    
    if (!savedMessage) {
      return res.status(500).json({ error: 'Failed to save message' });
    }
    
    // Broadcast the message to all connected clients
    io.emit('newMessage', {
      messageId: savedMessage._id,
      text: message,
      content: message,
      message: message,
      sender: username,
      createdAt: savedMessage.createdAt,
      timestamp: savedMessage.createdAt,
      image: cloudinaryResult.secure_url,
      location: locationData
    });
    
    // Signal clients to refresh their messages
    io.emit('refreshMessages');
    
    return res.status(201).json({
      success: true,
      message: 'Message with image sent successfully',
      messageId: savedMessage._id,
      imageUrl: cloudinaryResult.secure_url
    });
  } catch (error) {
    console.error('Error sending message with image:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to save message to database and update user's messages array
const saveMessageToDatabase = async (messageData, userId, retryCount = 0) => {
  try {
    // Validate required fields
    if (!messageData.text && !messageData.content && !messageData.message) {
      console.error('Message saving failed: No message text provided');
      return null;
    }
    
    if (!userId) {
      console.error('Message saving failed: No user ID provided');
      return null;
    }

    // Generate a messageId if not provided
    const messageId = messageData.messageId || 
                     `${userId.toString()}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Check if message with this ID already exists (for deduplication)
    const existingMessage = await Message.findOne({ messageId });
    
    if (existingMessage) {
      console.log(`Message with ID ${messageId} already exists, skipping duplicate`);
      return existingMessage;
    }
    
    // Create and save the message
    const message = new Message({
      messageId,
      text: messageData.text || messageData.content || messageData.message,
      userId: userId,
      senderUsername: messageData.sender,
      isApiMessage: messageData.isApiMessage || false,
      location: messageData.location,
      sequence: messageData._seq || 0,
      isResend: messageData.isResend || false,
      createdAt: messageData.createdAt || messageData.timestamp || new Date(),
      image: messageData.image
    });
    
    const savedMessage = await message.save();
    
    // Update user's messages array - use findOneAndUpdate for better atomicity
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { 
        $addToSet: { messages: savedMessage._id },  // Use $addToSet to prevent duplicates
        $set: { lastSeen: new Date() }              // Update lastSeen time
      },
      { new: true }
    );
    
    // Invalidate relevant cache entries
    if (redisClient.isReady && user) {
      // Invalidate user's messages cache and global messages cache
      await invalidateCache([
        `cache:/api/messages/${user.username}*`,
        `cache:/api/messages?*`
      ]);
    }
    
    console.log(`Message saved successfully: ${savedMessage._id} with messageId: ${messageId}`);
    return savedMessage;
  } catch (error) {
    // Check for duplicate key error (E11000)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.messageId) {
      console.log(`Duplicate messageId detected, fetching existing message`);
      const existingMessage = await Message.findOne({ 
        messageId: error.keyValue.messageId 
      });
      return existingMessage;
    }
    
    console.error('Error saving message:', error);
    
    // Retry logic for transient database errors, with max retries
    if (retryCount < 2) {
      console.log(`Retrying message save (attempt ${retryCount + 1})`);
      // Wait a bit before retrying to allow potential connection issues to resolve
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1))); // Exponential backoff
      return saveMessageToDatabase(messageData, userId, retryCount + 1);
    }
    
    return null;
  }
};

// Helper function to notify followers when a user posts a message
const notifyFollowers = async (userId, username, messageText, messageId) => {
  try {
    // If we have userId as a string, convert it to ObjectId format
    const userIdObj = typeof userId === 'string' ? mongoose.Types.ObjectId(userId) : userId;
    
    // Use lean queries for better performance
    const userWithFollowers = await User.findById(userIdObj)
      .select('followers')
      .lean();
    
    if (!userWithFollowers || !userWithFollowers.followers || userWithFollowers.followers.length === 0) {
      return; // No followers to notify
    }
    
    // Create notification payload
    const notificationPayload = {
      type: 'new_message',
      sender: username,
      messagePreview: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
      timestamp: new Date(),
      messageId: messageId
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

app.post('/api/messages', async (req, res) => {
  const { message, socketId, username, location } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  console.log('API Message received:', message, 'from socket ID:', socketId, 'User:', username || 'Unknown', 'Location:', location);
  
  // Create a unique ID for this message
  let messageId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
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
          timestamp: new Date(),
          location
        }, userId);
        
        if (savedMessage) {
          messageId = savedMessage._id;
          messageObj.dbId = messageId;
          
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
  
  res.status(201).json({ 
    success: true, 
    message: 'Message sent', 
    messageId,
    dbId: savedMessage ? savedMessage._id : null 
  });
});

// Get messages for a user with cursor-based pagination
app.get('/api/messages/:username', cache(30), async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 20, cursor, direction = 'older' } = req.query;
    
    // Validate limit (between 1 and 50)
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
    
    // Find the user without populating messages (we'll query messages separately for better pagination)
    const user = await User.findOne({ username }).select('_id');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query based on cursor and direction
    let query = { userId: user._id };
    let sortDirection = -1; // Default to newest first
    
    if (cursor) {
      // If we have a cursor, paginate based on it
      if (direction === 'older') {
        // Get messages older than the cursor
        query.createdAt = { $lt: new Date(cursor) };
        sortDirection = -1; // Descending (newest of the older messages first)
      } else {
        // Get messages newer than the cursor
        query.createdAt = { $gt: new Date(cursor) };
        sortDirection = 1; // Ascending (oldest of the newer messages first)
      }
    }
    
    // Execute query with limit and proper sorting
    const messages = await Message.find(query)
      .sort({ createdAt: sortDirection })
      .limit(parsedLimit + 1) // Get one extra to check if there are more messages
      .lean(); // Use lean for better performance
    
    // Check if there are more messages
    const hasMore = messages.length > parsedLimit;
    
    // Remove the extra message if we fetched one
    if (hasMore) {
      messages.pop();
    }
    
    // If we were getting newer messages but they're in ascending order, reverse them
    // so the newest ones are first in the response
    if (direction === 'newer' && sortDirection === 1) {
      messages.reverse();
    }
    
    // Get the next cursor
    const nextCursor = messages.length > 0 
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;
    
    // Return paginated results
    res.json({ 
      messages,
      pagination: {
        hasMore,
        nextCursor,
        direction
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all messages with cursor-based pagination
app.get('/api/messages', cache(30), async (req, res) => {
  try {
    const { 
      exclude,                // username to exclude
      limit = 20,             // number of messages to return
      cursor,                 // timestamp to use as cursor
      direction = 'older'     // 'older' or 'newer'
    } = req.query;
    
    // Validate limit (between 1 and 50)
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
    
    // Build base query
    let query = {};
    
    // If exclude parameter is provided, exclude messages from that user
    if (exclude) {
      const excludedUser = await User.findOne({ username: exclude });
      if (excludedUser) {
        query.userId = { $ne: excludedUser._id };
      }
    }
    
    // Add cursor-based conditions if cursor is provided
    let sortDirection = -1; // Default to newest first
    
    if (cursor) {
      // If we have a cursor, paginate based on it
      if (direction === 'older') {
        // Get messages older than the cursor
        query.createdAt = { $lt: new Date(cursor) };
        sortDirection = -1; // Descending (newest of the older messages first)
      } else {
        // Get messages newer than the cursor
        query.createdAt = { $gt: new Date(cursor) };
        sortDirection = 1; // Ascending (oldest of the newer messages first)
      }
    }
    
    // Execute query with limit and proper sorting
    const messages = await Message.find(query)
      .sort({ createdAt: sortDirection })
      .limit(parsedLimit + 1) // Get one extra to check if there are more messages
      .lean(); // Use lean for better performance
    
    // Check if there are more messages
    const hasMore = messages.length > parsedLimit;
    
    // Remove the extra message if we fetched one
    if (hasMore) {
      messages.pop();
    }
    
    // If we were getting newer messages but they're in ascending order, reverse them
    // so the newest ones are first in the response
    if (direction === 'newer' && sortDirection === 1) {
      messages.reverse();
    }
    
    // Get the next cursor
    const nextCursor = messages.length > 0 
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;
    
    // Return paginated results
    res.json({ 
      messages,
      pagination: {
        hasMore,
        nextCursor,
        direction
      }
    });
  } catch (error) {
    console.error('Error fetching all messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a message
app.post('/api/messages/:id/like', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user already liked this message
    const alreadyLiked = message.likes.some(id => id.toString() === userId.toString());
    
    if (alreadyLiked) {
      // If already liked, remove the like (toggle behavior)
      message.likes = message.likes.filter(id => id.toString() !== userId.toString());
      message.likesCount = message.likes.length;
      await message.save();

      // Also remove from user's likedMessages array
      user.likedMessages = user.likedMessages.filter(id => id.toString() !== messageId.toString());
      await user.save();

      // Broadcast message unlike event to all connected clients
      io.emit('messageUnliked', {
        messageId: messageId,
        likesCount: message.likesCount,
        unlikedByUsername: user.username
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Message unliked successfully',
        likesCount: message.likesCount,
        liked: false
      });
    } else {
      // Add user to likes array and increment likesCount
      message.likes.push(userId);
      message.likesCount = message.likes.length;
      await message.save();

      // Also add to user's likedMessages array
      user.likedMessages.push(messageId);
      await user.save();

      // Broadcast message like event to all connected clients
      io.emit('messageLiked', {
        messageId: messageId,
        likesCount: message.likesCount,
        likedByUsername: user.username
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Message liked successfully',
        likesCount: message.likesCount,
        liked: true
      });
    }
  } catch (error) {
    console.error('Error liking message:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Unlike a message (legacy endpoint - now redirects to like endpoint which handles toggling)
app.post('/api/messages/:id/unlike', protect, async (req, res) => {
  try {
    // Reuse the like endpoint which now toggles like status
    const messageId = req.params.id;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Check if user has liked this message
    const hasLiked = message.likes.some(id => id.toString() === userId.toString());
    
    if (!hasLiked) {
      return res.status(200).json({ 
        success: true, 
        message: 'Message not liked yet',
        likesCount: message.likesCount,
        liked: false
      });
    }

    // Remove user from likes array and decrement likesCount
    message.likes = message.likes.filter(id => id.toString() !== userId.toString());
    message.likesCount = message.likes.length;
    await message.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Message unliked successfully',
      likesCount: message.likesCount,
      liked: false
    });
  } catch (error) {
    console.error('Error unliking message:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get total likes for a user
app.get('/api/users/:username/likes', cache(300), async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Find all messages by this user
    const messages = await Message.find({ userId: user._id });
    
    // Calculate total likes
    const totalLikes = messages.reduce((sum, message) => sum + message.likesCount, 0);
    
    // Get top liked messages (limited to 5)
    const topLikedMessages = messages
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, 5)
      .map(message => ({
        id: message._id,
        text: message.text,
        likesCount: message.likesCount,
        createdAt: message.createdAt,
        location: message.location,
        author: {
          username: message.senderUsername
        }
      }));
    
    return res.status(200).json({ 
      success: true, 
      username,
      totalLikes,
      topLikedMessages
    });
  } catch (error) {
    console.error('Error fetching user likes:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get messages liked by a user
app.get('/api/users/:username/liked-messages', cache(300), async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Find all messages liked by this user
    const likedMessages = await Message.find({ _id: { $in: user.likedMessages } })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent liked messages
    
    // Format the messages for the client
    const formattedMessages = likedMessages.map(message => ({
      id: message._id,
      messageId: message.messageId,
      text: message.text,
      image: message.image,
      likesCount: message.likesCount,
      createdAt: message.createdAt,
      location: message.location,
      author: {
        username: message.senderUsername
      }
    }));
    
    return res.status(200).json({ 
      success: true, 
      username,
      likedMessages: formattedMessages,
      totalLiked: user.likedMessages.length
    });
  } catch (error) {
    console.error('Error fetching liked messages:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete a message
app.delete('/api/messages/:id', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Check if the user is the owner of the message
    if (message.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }

    // Remove message from user's messages array
    await User.findByIdAndUpdate(
      userId,
      { $pull: { messages: messageId } }
    );

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Invalidate relevant cache entries
    if (redisClient.isReady) {
      // Invalidate user's messages cache and global messages cache
      await invalidateCache([
        `cache:/api/messages/${req.user.username}*`,
        `cache:/api/messages?*`
      ]);
    }

    // Broadcast message deletion event to all connected clients
    io.emit('messageDeleted', {
      messageId: messageId,
      deletedByUsername: req.user.username
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Track last heartbeat time for zombie connection detection
  socket.lastHeartbeat = Date.now();
  
  // Handle heartbeat messages to detect stale connections
  socket.on('heartbeat', (data) => {
    socket.lastHeartbeat = Date.now();
    socket.emit('heartbeatAck', { 
      receivedAt: Date.now(),
      originalTimestamp: data.timestamp 
    });
  });
  
  // Store the username when a user connects
  socket.on('setUsername', async (data) => {
    try {
      console.log(`User ${data.username} associated with socket ID ${socket.id}`);
      socket.username = data.username;
      
      // Update user's online status in the database
      if (data.username) {
        const user = await User.findOneAndUpdate(
          { username: data.username },
          { 
            $set: { 
              isOnline: true,
              lastSeen: Date.now() 
            } 
          },
          { new: true }
        );
        
        if (user) {
          // Store user ID in socket for message persistence
          socket.userId = user._id;
          
          // Join a room specific to this user's followers for efficient broadcasting
          socket.join(`user:${user._id}`);
          
          // Get followers to add them to rooms for efficient notifications
          const followers = await User.find({ following: user._id }, '_id').lean();
          const followerIds = followers.map(f => f._id.toString());
          
          // Store follower IDs for efficient notification
          socket.followerIds = followerIds;
          
          // Broadcast user's online status to all clients
          io.emit('userStatusChange', {
            username: data.username,
            isOnline: true
          });
        }
      }
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  });
  
  // Emit welcome event to the connected client
  socket.emit('welcome', { message: 'Connected to server' });
  
  // Handle chat messages
  socket.on('sendMessage', async (data) => {
    console.log(`Message received from ${socket.username || socket.id}:`, data.message || data.text, 'Location:', data.location);
    
    // Extract or generate message ID for deduplication
    const messageId = data.messageId || 
                    `${socket.userId || socket.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract sequence number for ordering
    const sequence = data._seq || 0;
                    
    // Prepare message object
    const messageObj = {
      messageId: messageId,
      text: data.message || data.text,
      content: data.message || data.text, // Include content for backward compatibility
      message: data.message || data.text, // Include message for backward compatibility
      sender: socket.username || socket.id,
      createdAt: new Date(),
      timestamp: new Date(), // Include timestamp for backward compatibility
      location: data.location,
      _seq: sequence,
      isResend: data.isResend || false
    };
    
    // Save message to database if user is authenticated
    let savedMessage = null;
    if (socket.userId) {
      try {
        savedMessage = await saveMessageToDatabase(messageObj, socket.userId);
        if (savedMessage) {
          messageObj.dbId = savedMessage._id;
          
          // Notify followers about this new message using rooms for efficiency
          await notifyFollowers(socket.userId, socket.username, messageObj.text, messageId);
        } else {
          console.error('Failed to save message to database');
        }
      } catch (error) {
        console.error('Error handling message persistence:', error);
      }
    } else {
      console.warn('Message not saved: No user ID found for socket', socket.id);
    }
    
    // Only broadcast the message to other clients, not back to the sender
    // Using rooms would be more efficient but maintaining backward compatibility
    socket.broadcast.emit('newMessage', {
      ...messageObj,
      messageId // Include messageId for client-side deduplication
    });
    
    // Signal clients to refresh their messages from the database
    socket.broadcast.emit('refreshMessages');
    
    // Confirm message received and saved
    socket.emit('messageConfirmation', {
      success: true,
      messageId: messageId, // Include messageId for tracking
      original: data.message || data.text,
      createdAt: messageObj.createdAt,
      timestamp: messageObj.createdAt, // Include timestamp for backward compatibility
      dbId: savedMessage ? savedMessage._id : null,
      persistenceStatus: savedMessage ? 'saved' : 'not_saved',
      sequence: sequence // Echo back sequence for client tracking
    });
  });
  
  // Handle client disconnection
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    // Update user's online status in the database
    if (socket.username) {
      try {
        // Store username before processing disconnect
        const username = socket.username;
        
        // Reduce disconnect delay to minimize false offline appearances
        setTimeout(async () => {
          // Check if the user has reconnected with a different socket
          const isUserConnectedElsewhere = Array.from(io.sockets.sockets.values())
            .some(s => s.username === username && s.id !== socket.id);
          
          // Only mark as offline if user isn't connected elsewhere
          if (!isUserConnectedElsewhere) {
            // Use findOneAndUpdate for better atomicity
            const user = await User.findOneAndUpdate(
              { username },
              { 
                $set: { 
                  isOnline: false,
                  lastSeen: Date.now() 
                } 
              },
              { new: true }
            );
            
            if (user) {
              // Broadcast user's offline status to all clients
              io.emit('userStatusChange', {
                username,
                isOnline: false
              });
              
              console.log(`User ${username} marked as offline`);
            }
          } else {
            console.log(`User ${username} still connected elsewhere, not marking offline`);
          }
        }, 1000); // Reduced from 2000ms to 1000ms
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 