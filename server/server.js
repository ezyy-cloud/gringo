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
const Bot = require('./models/Bot');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const systemRoutes = require('./routes/systemRoutes');
const botRoutes = require('./routes/botRoutes');
const vesselsRoutes = require('./routes/vesselsRoutes');

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

// Apply rate limiting to all API routes
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for specific routes if needed
  if (process.env.NODE_ENV === 'development' && 
     (req.path === '/status' || req.path.startsWith('/auth/admin'))) {
    return next();
  }
  
  // Skip rate limiting for bot microservice endpoints
  if (req.path === '/bots/active' || req.path === '/bots/debug-api-key') {
    console.log('Skipping rate limiting for bot microservice endpoint:', req.path);
    return next();
  }
  
  // Skip rate limiting if the request has a valid bot API key
  const apiKey = req.headers['x-api-key'];
  const expectedBotApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  if (apiKey && apiKey === expectedBotApiKey) {
    console.log('Skipping rate limiting for bot client with valid API key');
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
    console.log('Skipping auth rate limiting for bot client with valid API key');
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
      console.log('Socket.IO Redis adapter configured for horizontal scaling');
    } catch (error) {
      console.error('Error setting up Socket.IO Redis adapter:', error);
      console.log('Socket.IO will operate without Redis adapter (no horizontal scaling)');
    }
  }
})();

// Initialize Socket Middleware
const socketMiddleware = createSocketMiddleware(io);

// Set up Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', async (data) => {
    try {
      const { token, username, userId } = data;
      
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
            
            console.log(`Socket ${socket.id} authenticated as ${isBot ? 'bot' : 'user'} ${socket.username}`);
          }
        } catch (tokenError) {
          console.error('Token validation error:', tokenError.message);
          isValidToken = false;
        }
      }
      
      // If token is invalid but we're in development, allow the connection
      // with the provided credentials (for testing purposes)
      if (!isValidToken && process.env.NODE_ENV === 'development') {
        socket.username = username;
        socket.userId = userId;
        isValidToken = true;
        console.log(`Socket ${socket.id} authenticated in dev mode as ${username}`);
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
        console.log(`Socket ${socket.id} joined room for user:${socket.userId}`);
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
          console.error('Error updating user/bot online status:', error);
        }
      }
      
      socket.emit('authenticated', { 
        success: true,
        username: socket.username,
        userId: socket.userId,
        isBot
      });
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });
  
  // Handle messages
  socket.on('message', async (data) => {
    try {
      const { message, username, location } = data;
      
      // Use socket's username if set during authentication, or fall back to data
      const senderUsername = socket.username || username || 'Anonymous';
      console.log('Message received:', message, 'from', senderUsername);
      
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
          console.error('Error saving message to database:', error);
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
      console.error('Error handling message:', error);
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
      
      console.log('SendMessage received:', message, 'from', senderUsername);
      
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
          console.error('Error saving message to database:', error);
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
      console.error('Error handling sendMessage:', error);
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
    console.log('Socket disconnected:', socket.id);
    
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
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

// Mount route handlers
// Add debug endpoint directly in main server for API key testing
app.get('/debug-api-key', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  
  console.log('DEBUG API KEY CHECK:');
  console.log(`- Received API Key: ${apiKey}`);
  console.log(`- Expected API Key: ${expectedApiKey}`);
  console.log(`- Headers: ${JSON.stringify(req.headers)}`);
  
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
    console.log('Direct active bots endpoint called');
    
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
        console.log(`Added default type '${defaultType}' to bot ${bot.username}`);
      }
    }
    
    return res.status(200).json({
      success: true,
      bots: bots
    });
  } catch (error) {
    console.error('Error getting active bots:', error);
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
    console.error('Migration error:', error);
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
app.use('/api/vessels', vesselsRoutes);

// Special route handlers that need Socket.IO
const messageHandlers = socketMiddleware.getMessageHandlers();

// Mount message routes
app.use('/api/messages', messageRoutes);

// Add special Socket.IO dependent routes
app.post('/api/messages', messageHandlers.createMessage);
app.post('/api/messages/with-image', protect, upload.single('image'), messageHandlers.createMessageWithImage);

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
  console.log(`Server running on port ${PORT}`);
}); 