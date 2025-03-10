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
const logger = require('./utils/logger');

// Import models
const User = require('./models/User');
const Message = require('./models/Message');
const Bot = require('./models/Bot');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const systemRoutes = require('./routes/systemRoutes');
const botRoutes = require('./routes/botRoutes');

// Import middleware
const { protect } = require('./middleware/authMiddleware');
const { adminProtect } = require('./middleware/adminMiddleware');
const { cache, invalidateCache } = require('./middleware/cacheMiddleware');
const createSocketMiddleware = require('./middleware/socketMiddleware');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Set server timeout for longer requests (like file uploads)
server.timeout = 120000; // 2 minutes

// Trust proxy configuration for Express Rate Limit
// Instead of setting to true (which is too permissive), specify trusted proxies
// For production, this should be your load balancer or reverse proxy IP addresses
app.set('trust proxy', process.env.NODE_ENV === 'production' 
  ? ['loopback', 'linklocal', 'uniquelocal'] // For production: more restrictive
  : ['127.0.0.1', '::1'] // For development: localhost only
);

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
    logger.info('Redis clients connected');
    
    // Set up error handling
    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });
    
    redisClientForSocketIO.on('error', (err) => {
      logger.error('Redis Socket.IO adapter error:', err);
    });
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Continue without Redis if it's not available
    logger.info('Continuing without Redis caching and Socket.IO scaling');
  }
})();

// Make Redis client available to the app
app.set('redisClient', redisClient);

// Configure CORS for Express
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3001", "http://127.0.0.1:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use a more secure IP identifier
  keyGenerator: (req, res) => {
    // Get the client's IP address, considering the trusted proxy settings above
    return req.ip; 
  },
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

// More strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // Higher limit for development
  standardHeaders: true,
  legacyHeaders: false,
  // Use a more secure IP identifier
  keyGenerator: (req, res) => {
    // Get the client's IP address, considering the trusted proxy settings above
    return req.ip;
  },
  message: {
    status: 429,
    message: 'Too many auth attempts, please try again later.'
  }
});

// Connect to MongoDB with optimized connection pooling
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    logger.info('MongoDB Connected');
  })
  .catch(err => {
    logger.error('MongoDB Connection Error:', err);
  });

// Set up connection monitoring
const db = mongoose.connection;

db.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

db.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

// Apply rate limiting to all API routes
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for specific routes if needed
  if (process.env.NODE_ENV === 'development' && 
     (req.path === '/status' || req.path.startsWith('/auth/admin'))) {
    return next();
  }
  
  // Skip rate limiting for bot microservice endpoints
  if (req.path === '/bots/active' || req.path === '/bots/debug-api-key') {
    logger.info('Skipping rate limiting for bot microservice endpoint:', req.path);
    return next();
  }
  
  // Skip rate limiting if the request has a valid bot API key
  const apiKey = req.headers['x-api-key'];
  const expectedBotApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  if (apiKey && apiKey === expectedBotApiKey) {
    logger.info('Skipping rate limiting for bot client with valid API key');
    return next();
  }
  
  apiLimiter(req, res, next);
});

// Apply auth rate limiting
app.use('/api/auth/', (req, res, next) => {
  // Skip rate limiting for admin check during development
  if (process.env.NODE_ENV === 'development' && req.path === '/admin') {
    return next();
  }
  
  // Skip rate limiting if the request has a valid bot API key
  const apiKey = req.headers['x-api-key'];
  const expectedBotApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  if (apiKey && apiKey === expectedBotApiKey) {
    logger.info('Skipping auth rate limiting for bot client with valid API key');
    return next();
  }
  
  // Only apply to login and register endpoints
  if (req.path === '/login' || req.path === '/register') {
    return authLimiter(req, res, next);
  }
  next();
});

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Increase to 10MB (from 5MB)
  },
  preservePath: true
});

// Set up Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3001", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Set up Socket.IO Redis adapter if Redis is connected
(async () => {
  if (redisClient.isReady && redisClientForSocketIO.isReady) {
    try {
      // Create pub/sub clients
      const pubClient = redisClient;
      const subClient = redisClientForSocketIO;
      
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter configured for horizontal scaling');
    } catch (error) {
      logger.error('Error setting up Socket.IO Redis adapter:', error);
      logger.info('Socket.IO will operate without Redis adapter (no horizontal scaling)');
    }
  }
})();

// Initialize Socket Middleware
const socketMiddleware = createSocketMiddleware(io);

// Set up Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New socket connection:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', async (data) => {
    try {
      const { token, username, userId, botId, apiKey } = data;
      
      // For bot API key authentication
      if (botId && apiKey) {
        try {
          // Log bot authentication attempt, but mask most of the API key for security
          const maskedApiKey = apiKey ? '****' + apiKey.slice(-4) : 'undefined';
          const sanitizedPayload = { botId, apiKey: maskedApiKey };
          logger.info(`[SERVER] Bot authentication attempt with payload: ${JSON.stringify(sanitizedPayload)}`);
          
          // Verify the bot's identity
          const bot = await Bot.findById(botId);
          if (!bot || !bot.apiKey || bot.apiKey !== apiKey) {
            logger.error(`[SERVER] Bot authentication failed: Invalid credentials for bot ${botId}`);
            socket.emit('authenticated', { success: false, error: 'Invalid bot credentials' });
            return;
          }
          
          // Store bot's data in the socket
          socket.username = bot.username;
          socket.userId = bot._id;
          socket.isBot = true;
          
          logger.info(`[SERVER] Bot authentication successful for bot ${botId}`);
          
          // Join bot-specific room
          socket.join(`user:${bot._id}`);
          logger.info(`Socket ${socket.id} joined room for user:${bot._id}`);
          
          socket.emit('authenticated', {
            success: true,
            username: bot.username,
            userId: bot._id,
            isBot: true
          });
          
          return;
        } catch (error) {
          logger.error(`[SERVER] Bot authentication failed: ${error.message}`);
          socket.emit('authenticated', { success: false, error: 'Bot authentication failed' });
          return;
        }
      }
      
      // Validate the token
      let isValidToken = false;
      let isBot = false;
      let validatedUserId = null;
      
      if (token) {
        try {
          // Verify JWT token
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check if the token contains valid user data
          if (decoded && decoded.id) {
            isValidToken = true;
            validatedUserId = decoded.id;
            isBot = decoded.isBot === true;
            
            // Store the validated information
            socket.username = decoded.username || username;
            socket.userId = decoded.id;
            socket.isBot = isBot;
            
            logger.info(`Socket ${socket.id} authenticated as ${isBot ? 'bot' : 'user'} ${socket.username}`);
          }
        } catch (tokenError) {
          logger.error('Token validation error:', tokenError.message);
          isValidToken = false;
        }
      }
      
      // If token is invalid but we're in development, allow the connection
      // with the provided credentials (for testing purposes)
      if (!isValidToken && process.env.NODE_ENV === 'development') {
        socket.username = username;
        socket.userId = userId;
        isValidToken = true;
        logger.info(`Socket ${socket.id} authenticated in dev mode as ${username}`);
      }
      
      // If authentication failed, reject the connection
      if (!isValidToken) {
        socket.emit('authenticated', { 
          success: false, 
          error: 'Invalid authentication token' 
        });
        return;
      }
      
      // Join a user-specific room for targeted messages
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
        logger.info(`Socket ${socket.id} joined room for user:${socket.userId}`);
      }
      
      // Update user's online status - skip for bots if configured
      if (socket.username && (!isBot || (isBot && process.env.BOTS_APPEAR_ONLINE !== 'false'))) {
        try {
          await User.findOneAndUpdate(
            { username: socket.username }, 
            { 
              isOnline: true,
              lastSeen: new Date()
            }
          );
          
          // Broadcast that user/bot is online to all sockets
          socket.broadcast.emit('userOnline', { 
            username: socket.username,
            isBot
          });
        } catch (error) {
          logger.error('Error updating user/bot online status:', error);
        }
      }
      
      socket.emit('authenticated', { 
        success: true,
        username: socket.username,
        userId: socket.userId,
        isBot
      });
    } catch (error) {
      logger.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });
  
  // Handle messages
  socket.on('message', async (data) => {
    try {
      const { message, username, location } = data;
      
      // Use socket's username if set during authentication, or fall back to data
      const senderUsername = socket.username || username || 'Anonymous';
      logger.info('Message received:', message, 'from', senderUsername);
      
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
        sender: senderUsername,
        senderSocketId: socket.id,
        location,
        eventType: 'message' // Standard event type
      };
      
      // Save to database if a username is provided
      let savedMessage = null;
      let userId = null;
      
      if (senderUsername && senderUsername !== 'Anonymous') {
        try {
          // Find the user
          const user = await User.findOne({ username: senderUsername });
          if (user) {
            userId = user._id;
            
            // SOLUTION 1 (commented out): Use the saveMessageToDatabase function
            /*
            const messageController = require('./controllers/messageController');
            savedMessage = await messageController.saveMessageToDatabase({
              text: message,
              sender: senderUsername,
              messageId: messageId,
              timestamp: new Date(),
              location
            }, user._id);
            */
            
            // SOLUTION 2: Create Message with correct field names
            const messageToSave = new Message({
              messageId: messageId,  // Add the required messageId field
              text: message,
              senderUsername: senderUsername,  // Use the correct field name
              userId: userId,
              timestamp: new Date(),
              location
            });
            
            savedMessage = await messageToSave.save();
            
            if (savedMessage) {
              messageId = savedMessage._id;
              messageObj.dbId = messageId;
              
              // Notify followers
              await socketMiddleware.notifyFollowers(userId, senderUsername, message, messageId);
            }
          }
        } catch (error) {
          logger.error('Error saving message to database:', error);
        }
      }
      
      // Broadcast message to all other clients
      socket.broadcast.emit('message', messageObj);
      
      // Acknowledge receipt to the sender with the message ID
      socket.emit('messageAck', { 
        id: messageId,
        dbId: savedMessage ? savedMessage._id : null,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error handling message:', error);
      socket.emit('error', { message: 'Error processing your message' });
    }
  });
  
  // Handle sendMessage events (for backward compatibility with bots client)
  socket.on('sendMessage', async (data) => {
    try {
      // Extract message data with different possible field names for compatibility
      const message = data.message || data.text || data.content;
      
      // Use authenticated socket username, data username/sender, or Anonymous as fallback
      const senderUsername = socket.username || data.username || data.sender || 'Anonymous';
      const location = data.location || null;
      
      logger.info('SendMessage received:', message, 'from', senderUsername);
      
      // Create a unique ID for this message (use provided ID or create new one)
      let messageId = data.messageId || (Date.now().toString(36) + Math.random().toString(36).substring(2));
      
      // Prepare the message object
      const messageObj = { 
        id: messageId,
        text: message,
        content: message, 
        message: message,
        createdAt: new Date(),
        timestamp: new Date(),
        sender: senderUsername,
        senderSocketId: socket.id,
        location,
        eventType: 'message' // Standard event type
      };
      
      // Save to database if a username is provided and not 'Anonymous'
      let savedMessage = null;
      let userId = null;
      
      if (senderUsername && senderUsername !== 'Anonymous') {
        try {
          // Find the user
          const user = await User.findOne({ username: senderUsername });
          if (user) {
            userId = user._id;
            
            // SOLUTION 1 (commented out): Use the saveMessageToDatabase function
            /*
            const messageController = require('./controllers/messageController');
            savedMessage = await messageController.saveMessageToDatabase({
              text: message,
              sender: senderUsername,
              messageId: messageId,
              timestamp: new Date(),
              location
            }, user._id);
            */
            
            // SOLUTION 2: Create Message with correct field names
            const messageToSave = new Message({
              messageId: messageId,  // Add the required messageId field
              text: message,
              senderUsername: senderUsername,  // Use the correct field name
              userId: userId,
              timestamp: new Date(),
              location
            });
            
            savedMessage = await messageToSave.save();
            
            if (savedMessage) {
              messageId = savedMessage._id;
              messageObj.dbId = messageId;
              
              // Notify followers
              await socketMiddleware.notifyFollowers(userId, senderUsername, message, messageId);
            }
          }
        } catch (error) {
          logger.error('Error saving message to database:', error);
        }
      }
      
      // Broadcast message to all other clients
      socket.broadcast.emit('message', messageObj);
      
      // Acknowledge receipt to the sender with the message ID
      socket.emit('messageAck', { 
        id: messageId,
        dbId: savedMessage ? savedMessage._id : null,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error handling sendMessage:', error);
      socket.emit('error', { message: 'Error processing your message' });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    // Broadcast to everyone except sender
    socket.broadcast.emit('userTyping', {
      username: data.username || 'Anonymous',
      typing: data.typing
    });
  });
  
  // Handle user going offline
  socket.on('disconnect', async () => {
    logger.info('Socket disconnected:', socket.id);
    
    // Update user's online status if we have a username
    if (socket.username) {
      try {
        // Check if user has other active connections before marking offline
        const activeSockets = Array.from(io.sockets.sockets.values()).filter(
          s => s.id !== socket.id && s.username === socket.username
        );
        
        if (activeSockets.length === 0) {
          // No other active connections, mark user as offline
          await User.findOneAndUpdate(
            { username: socket.username }, 
            { 
              isOnline: false,
              lastSeen: new Date()
            }
          );
          
          // Broadcast that user is offline to all sockets
          socket.broadcast.emit('userOffline', { username: socket.username });
        }
      } catch (error) {
        logger.error('Error updating user offline status:', error);
      }
    }
  });
});

// Mount route handlers
// Add debug endpoint directly in main server for API key testing
app.get('/debug-api-key', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  
  logger.info('DEBUG API KEY CHECK:');
  logger.info(`- Received API Key: ${apiKey}`);
  logger.info(`- Expected API Key: ${expectedApiKey}`);
  logger.info(`- Headers: ${JSON.stringify(req.headers)}`);
  
  res.status(200).json({
    success: true,
    message: 'API key check logged to console',
    match: apiKey === expectedApiKey,
    received: apiKey,
    expected: expectedApiKey
  });
});

// Direct route for active bots (no authentication)
app.get('/api/bots-direct/active', async (req, res) => {
  try {
    logger.info('Direct active bots endpoint called');
    
    // Find all active bots
    const bots = await Bot.find({ 
      isBot: true,
      status: 'active'
    }).select('-password -webhookSecret');
    
    // Add default type to any bots that don't have it
    for (const bot of bots) {
      if (!bot.type) {
        // Set a default type based on the bot's purpose or capabilities
        let defaultType = 'echo';
        
        // Try to infer type from purpose or capabilities
        if (bot.purpose && bot.purpose.toLowerCase().includes('notification')) {
          defaultType = 'notification';
        } else if (bot.capabilities && bot.capabilities.includes('commandProcessing')) {
          defaultType = 'command';
        }
        
        // Update the bot in the database
        await Bot.findByIdAndUpdate(bot._id, { type: defaultType });
        
        // Update the object for the response
        bot.type = defaultType;
        logger.info(`Added default type '${defaultType}' to bot ${bot.username}`);
      }
    }
    
    return res.status(200).json({
      success: true,
      bots: bots
    });
  } catch (error) {
    logger.error('Error getting active bots:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get active bots'
    });
  }
});

// Migration endpoint to add type to all existing bots
app.post('/api/admin/migrate/add-bot-type', adminProtect, async (req, res) => {
  try {
    const addTypeToExistingBots = require('./scripts/addBotType');
    const result = await addTypeToExistingBots();
    
    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      result
    });
  } catch (error) {
    logger.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run migration'
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/bots', botRoutes);

// Special route handlers that need Socket.IO
const messageHandlers = socketMiddleware.getMessageHandlers();

// Mount message routes
app.use('/api/messages', messageRoutes);

// Add special Socket.IO dependent routes
app.post('/api/messages', messageHandlers.createMessage);
app.post('/api/messages/with-image', protect, upload.single('image'), async (req, res) => {
  try {
    // Extract parameters from the request
    const { text, content, location } = req.body;
    const file = req.file;
    
    // Debug authentication information
    logger.info(`Authentication debug: ${JSON.stringify({
      hasUser: !!req.user,
      userInfo: req.user ? {
        id: req.user._id ? req.user._id.toString() : 'missing',
        username: req.user.username || 'missing',
        hasAuth: !!req.auth
      } : 'missing'
    })}`);
    
    // Ensure text is not undefined (set default empty string if needed)
    const messageText = text || content || '';
    
    // Get user data with multiple fallbacks
    let userId, username;
    
    // Case 1: We have a fully populated user object with ID
    if (req.user && req.user._id) {
      userId = req.user._id;
      username = req.user.username;
      logger.info(`Using authenticated user with ID: ${username} (${userId})`);
    } 
    // Case 2: We have a user object with username but no ID (look it up)
    else if (req.user && req.user.username) {
      username = req.user.username;
      logger.info(`Looking up user ID for username: ${username}`);
      
      try {
        // Look up the user by username
        const user = await User.findOne({ username });
        if (user && user._id) {
          userId = user._id;
          logger.info(`Found user ID: ${userId} for username: ${username}`);
        } else {
          logger.error(`Could not find user with username: ${username}`);
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
      } catch (lookupError) {
        logger.error(`Error looking up user: ${lookupError.message}`);
        return res.status(500).json({
          success: false,
          error: 'Error looking up user'
        });
      }
    }
    // Case 3: Alternative auth property
    else if (req.auth) {
      userId = req.auth.id;
      username = req.auth.username;
      logger.info(`Using auth token user: ${username} (${userId})`);
    } 
    // Case 4: Data in request body (development only)
    else if (process.env.NODE_ENV === 'development' && req.body.userId && req.body.username) {
      userId = req.body.userId;
      username = req.body.username;
      logger.info(`Using body-provided user: ${username} (${userId})`);
    } 
    // No valid user information
    else {
      logger.error('No user information available for image upload');
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }
    
    // Parse location data if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = JSON.parse(location);
        logger.info(`Parsed location from string: ${JSON.stringify(parsedLocation)}`);
      } catch (err) {
        logger.error(`Error parsing location: ${err.message}`);
        // Continue without location data
      }
    }
    
    if (file) {
      logger.info(`Image upload received with location data: ${JSON.stringify({
        rawLocation: location,
        parsedLocation,
        hasCoordinates: parsedLocation && parsedLocation.latitude ? 'YES' : 'NO',
        fuzzyLocation: parsedLocation && parsedLocation.fuzzyLocation ? 'YES' : 'NO'
      })}`);
      
      logger.info(`Image upload details: ${JSON.stringify({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer.length,
        bufferStart: file.buffer.toString('hex').substring(0, 50) + '...'
      })}`);
      
      logger.info(`Image upload received: ${file.originalname} from socket ID: ${req.body.socketId || 'unknown'} User: ${username}`);
      
      // Upload to Cloudinary with retry logic
      let cloudinaryResult = null;
      const maxRetries = 3;
      let attempt = 1;
      
      while (attempt <= maxRetries && !cloudinaryResult) {
        try {
          logger.info(`Attempting Cloudinary upload (attempt ${attempt}/${maxRetries})`);
          
          // Create a stream from the buffer
          const stream = streamifier.createReadStream(file.buffer);
          
          // Upload the image to Cloudinary
          cloudinaryResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'messages',
                resource_type: 'auto',
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            stream.pipe(uploadStream);
          });
          
        } catch (err) {
          logger.error(`Cloudinary upload error (attempt ${attempt}/${maxRetries}): ${err.message}`);
          attempt++;
          
          // Wait before retrying
          if (attempt <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!cloudinaryResult) {
        logger.error('Failed to upload image after multiple attempts');
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to upload image after multiple attempts' 
        });
      }
      
      // Prepare message data for database - ensure required fields
      const messageData = {
        text: messageText || 'Image message', // Use the text or provide a default for image-only messages
        content: messageText || 'Image message', // Also set content field for compatibility
        userId: userId, // Use the userId we determined above
        senderUsername: username,
        messageId: Date.now().toString(36) + Math.random().toString(36).substring(2),
        imageUrl: cloudinaryResult.secure_url,
        timestamp: new Date()
      };
      
      // Add location data if available
      if (parsedLocation) {
        logger.info(`About to save message with location data: ${JSON.stringify({
          hasLocation: 'YES',
          hasCoordinates: parsedLocation.latitude ? 'YES' : 'NO',
          locationData: parsedLocation
        })}`);
        
        messageData.location = parsedLocation;
        logger.info(`Saving message to database with location data: ${JSON.stringify(parsedLocation)}`);
      }
      
      // Log the message data before saving to help debug validation issues
      logger.info(`Attempting to save message with data: ${JSON.stringify({
        hasText: !!messageData.text,
        textLength: messageData.text.length,
        hasUserId: !!messageData.userId,
        userId: messageData.userId.toString ? messageData.userId.toString() : messageData.userId,
        senderUsername: messageData.senderUsername
      })}`);
      
      // Save message to database
      const message = new Message(messageData);
      
      try {
        const savedMessage = await message.save();
        
        if (savedMessage && savedMessage.location) {
          logger.info(`Location data saved for message: (${savedMessage.location.latitude}, ${savedMessage.location.longitude})`);
        }
        
        logger.info(`Message saved to database: ${savedMessage._id}${savedMessage.location ? `, Location: ${JSON.stringify(savedMessage.location)}` : ''}`);
        
        // Prepare response message object
        const messageObj = {
          id: savedMessage._id,
          text: savedMessage.text,
          sender: username,
          imageUrl: cloudinaryResult.secure_url,
          createdAt: savedMessage.timestamp,
          location: savedMessage.location
        };
        
        // Broadcast message to all connected clients
        if (savedMessage.location) {
          logger.info(`Broadcasting message with location: (${savedMessage.location.latitude}, ${savedMessage.location.longitude})`);
        }
        
        io.emit('message', messageObj);
        logger.info(`API Message sent to all other clients by manual filtering with ID: ${savedMessage.messageId}`);
        
        // Return success response
        return res.status(201).json({ 
          success: true, 
          message: savedMessage 
        });
      } catch (dbError) {
        logger.error(`Database error saving message: ${dbError.message}`);
        // If validation error, provide more details
        if (dbError.name === 'ValidationError') {
          logger.error(`Validation errors: ${JSON.stringify(dbError.errors)}`);
        }
        return res.status(500).json({ 
          success: false, 
          error: `Database error: ${dbError.message}` 
        });
      }
      
    } else {
      logger.error('No image file found in request');
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
    }
  } catch (error) {
    logger.error(`Error in image upload: ${error.message}`);
    if (error.stack) {
      logger.error(`Error stack: ${error.stack}`);
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Gringo server is running'
  });
});

// Bot service health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'main-server',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
}); 