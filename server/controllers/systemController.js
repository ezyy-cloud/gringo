const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

// Get server status
const getStatus = async (req, res) => {
  try {
    // Get database connection status
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get basic stats
    const userCount = await User.countDocuments();
    const messageCount = await Message.countDocuments();
    
    // Get system info
    const nodeVersion = process.version;
    const platform = process.platform;
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    return res.status(200).json({
      success: true,
      data: {
        server: {
          status: 'online',
          uptime: uptime,
          startTime: new Date(Date.now() - (uptime * 1000)).toISOString(),
          nodeVersion,
          platform
        },
        database: {
          status: dbStatus,
          userCount,
          messageCount
        },
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB'
        }
      }
    });
  } catch (error) {
    console.error('Error getting server status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving server status',
      error: error.message
    });
  }
};

module.exports = {
  getStatus
}; 