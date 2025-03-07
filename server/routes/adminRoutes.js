const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminMiddleware');

// Apply admin protection middleware to all admin routes
router.use(adminProtect);

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);

// Message management
router.get('/messages', adminController.getMessages);
router.delete('/messages/:id', adminController.deleteMessage);

// Analytics
router.get('/analytics/users', (req, res) => {
  req.params.type = 'users';
  adminController.getAnalytics(req, res);
});

router.get('/analytics/messages', (req, res) => {
  req.params.type = 'messages';
  adminController.getAnalytics(req, res);
});

router.get('/analytics/bots', adminController.getBotAnalytics);

router.get('/analytics/locations', (req, res) => {
  req.params.type = 'locations';
  adminController.getAnalytics(req, res);
});

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router; 