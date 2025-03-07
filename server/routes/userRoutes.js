const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { cache } = require('../middleware/cacheMiddleware');

// Get user profile
router.get('/:username', cache(60), userController.getUserProfile);

// Follow a user
router.post('/:username/follow', userController.followUser);

// Unfollow a user
router.post('/:username/unfollow', userController.unfollowUser);

// Get user's liked messages
router.get('/:username/likes', cache(300), userController.getUserLikes);

// Get messages liked by a user
router.get('/:username/liked-messages', cache(300), userController.getLikedMessages);

module.exports = router; 