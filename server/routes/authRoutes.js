const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Forgot password (request password reset)
router.post('/forgot-password', authController.forgotPassword);

// Reset password with token
router.post('/reset-password/:token', authController.resetPassword);

// Get current user (protected route)
router.get('/me', protect, authController.getCurrentUser);

// Update user profile (protected route)
router.put('/profile', protect, authController.updateProfile);

module.exports = router; 