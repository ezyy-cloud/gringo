const express = require('express');
const router = express.Router();
const { initializeVesselTracking, getVessels } = require('../controllers/vesselsController');

// Add request logging middleware for debugging
router.use((req, res, next) => {
  console.log(`Vessel API request: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @route   POST /api/vessels/init
 * @desc    Initialize vessel tracking with AISStream API key
 * @access  Private (admin)
 */
router.post('/init', initializeVesselTracking);

/**
 * @route   GET /api/vessels
 * @desc    Get all tracked vessels
 * @access  Public
 */
router.get('/', getVessels);

module.exports = router; 