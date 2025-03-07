const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { cache } = require('../middleware/cacheMiddleware');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Create message routes
// Note: These routes need broadcastMessage and notifyFollowers from server.js,
// which will be passed as middleware when mounting these routes

// Get all messages
router.get('/', cache(30), messageController.getAllMessages);

// Get messages from a specific user
router.get('/:username', cache(30), messageController.getUserMessages);

// Like a message
router.post('/:id/like', protect, messageController.likeMessage);

// Unlike a message
router.post('/:id/unlike', protect, messageController.unlikeMessage);

// Delete a message
router.delete('/:id', protect, messageController.deleteMessage);

module.exports = router; 