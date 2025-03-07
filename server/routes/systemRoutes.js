const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// Get server status
router.get('/status', systemController.getStatus);

// Health check endpoint for bot service
router.get('/health', systemController.getStatus);

module.exports = router; 