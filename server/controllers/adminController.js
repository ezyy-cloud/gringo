const User = require('../models/User');
const Message = require('../models/Message');
const Bot = require('../models/Bot');
const cloudinary = require('cloudinary');

/**
 * Get dashboard stats for admin dashboard
 * @route GET /api/admin/dashboard
 * @access Private (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    const activeUsers = await User.countDocuments({
      lastSeen: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Active in last 7 days
    });

    // Get message statistics
    const totalMessages = await Message.countDocuments();
    const newMessages = await Message.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Get bot statistics
    const totalBots = await Bot.countDocuments({ isBot: true });
    const activeBots = await Bot.countDocuments({ 
      isBot: true,
      status: 'active'
    });
    const newBots = await Bot.countDocuments({
      isBot: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Calculate growth percentages
    const previousMonthUsers = await User.countDocuments({
      createdAt: {
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    });
    const userGrowth = previousMonthUsers > 0 ? ((newUsers / previousMonthUsers) - 1) * 100 : 100;

    const previousMonthMessages = await Message.countDocuments({
      createdAt: {
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    });
    const messageGrowth = previousMonthMessages > 0 ? ((newMessages / previousMonthMessages) - 1) * 100 : 100;

    const previousMonthBots = await Bot.countDocuments({
      isBot: true,
      createdAt: {
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    });
    const botGrowth = previousMonthBots > 0 ? ((newBots / previousMonthBots) - 1) * 100 : 100;

    // Get message activity over time (last 30 days)
    const messageActivity = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // Initialize variables with default values
    let topLocations = [];
    let totalLocations = 0;

    try {
      // Get top locations from messages
      topLocations = await Message.aggregate([
        {
          $match: {
            'location.latitude': { $exists: true, $ne: null },
            'location.longitude': { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            name: { 
              $concat: [
                "Message ", 
                { $substr: [{ $toString: "$messageId" }, 0, 8] },
                " - ",
                { $substr: ["$text", 0, 20] }
              ]
            },
            count: { $literal: 1 },
            coordinates: [
              "$location.longitude", 
              "$location.latitude"
            ],
            text: { $substr: ["$text", 0, 50] },
            messageId: 1
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 200 // Limit to 200 most recent messages with location data
        }
      ]);

      // Count total unique locations (rounded to 2 decimal places for proximity grouping)
      const uniqueLocationsCount = await Message.aggregate([
        {
          $match: {
            'location.latitude': { $exists: true, $ne: null },
            'location.longitude': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              lat: { $round: ["$location.latitude", 2] },
              lng: { $round: ["$location.longitude", 2] }
            }
          }
        },
        {
          $count: "totalLocations"
        }
      ]);

      // Extract the count value or default to 0 if no locations
      totalLocations = uniqueLocationsCount.length > 0 ? uniqueLocationsCount[0].totalLocations : 0;
    } catch (locationError) {
      console.error('Error processing location data:', locationError);
      // Continue with empty locations data rather than failing the entire request
    }

    // Get bot type distribution
    let botTypeDistribution = [];
    try {
      const botTypes = await Bot.aggregate([
        {
          $match: { isBot: true }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Format bot types for chart
      botTypeDistribution = botTypes.map(type => ({
        name: type._id || 'default',
        value: type.count
      }));
    } catch (botTypeError) {
      console.error('Error processing bot type distribution:', botTypeError);
    }
    
    // If no bot types data, provide sample data
    if (botTypeDistribution.length === 0) {
      const botUtils = require('../utils/botUtils');
      const validTypes = botUtils.VALID_BOT_TYPES || ['ChatGPT', 'Claude', 'Gemini', 'Custom'];
      
      botTypeDistribution = validTypes.map(type => ({
        name: type,
        value: Math.floor(Math.random() * 5) + 1 // Random count between 1-5
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalMessages,
        totalLocations,
        totalBots,
        activeBots,
        userGrowth,
        messageGrowth,
        botGrowth,
        messageActivity,
        topLocations,
        botTypeDistribution
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all users for admin
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.isAdmin ? 'admin' : 'user',
      status: user.isOnline ? 'active' : 'inactive',
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      messagesCount: user.messages.length,
      followersCount: user.followers.length,
      followingCount: user.following.length
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    console.error('Error getting admin users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all messages for admin
 * @route GET /api/admin/messages
 * @access Private (Admin only)
 */
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(100);

    const formattedMessages = messages.map(message => ({
      id: message._id,
      content: message.text,
      userId: message.userId,
      username: message.senderUsername,
      createdAt: message.createdAt,
      location: message.location ? `${message.location.latitude}, ${message.location.longitude}` : 'Unknown',
      likes: message.likesCount,
      isApiMessage: message.isApiMessage
    }));

    res.status(200).json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    console.error('Error getting admin messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a message (admin)
 * @route DELETE /api/admin/messages/:id
 * @access Private (Admin only)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the message
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Delete message
    await Message.findByIdAndDelete(id);
    
    // If message had an image, delete it from Cloudinary
    if (message.image && message.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(message.imagePublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Continue with message deletion even if image deletion fails
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get analytics data for admin
 * @route GET /api/admin/analytics/:type
 * @access Private (Admin only)
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { type } = req.params;
    const { period = 'month' } = req.query;
    let data, startDate;

    // Determine time period
    switch (period) {
      case 'day':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    let timeFormat;
    if (period === 'day') {
      timeFormat = '%H:00';
    } else if (period === 'week' || period === 'month') {
      timeFormat = '%Y-%m-%d';
    } else {
      timeFormat = '%Y-%m';
    }

    // Process analytics based on type
    switch (type) {
      case 'users':
        // Get total users
        const totalUsers = await User.countDocuments();
        
        // Get user growth data
        const usersData = await User.aggregate([
          {
            $match: { createdAt: { $gte: startDate } }
          },
          {
            $group: {
              _id: { $dateToString: { format: timeFormat, date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              date: "$_id",
              count: 1,
              _id: 0
            }
          }
        ]);
        
        // Calculate growth percentage
        const previousPeriodUsers = await User.countDocuments({
          createdAt: {
            $lt: startDate,
            $gte: new Date(startDate.getTime() - (startDate.getTime() - new Date(0).getTime()))
          }
        });
        
        const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
        const userGrowth = previousPeriodUsers > 0 ? ((newUsers / previousPeriodUsers) - 1) * 100 : 100;
        
        data = {
          data: usersData,
          total: totalUsers,
          growth: userGrowth
        };
        break;
        
      case 'messages':
        // Get total messages
        const totalMessages = await Message.countDocuments();
        
        // Get message data over time
        const messagesData = await Message.aggregate([
          {
            $match: { createdAt: { $gte: startDate } }
          },
          {
            $group: {
              _id: { $dateToString: { format: timeFormat, date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              date: "$_id",
              count: 1,
              _id: 0
            }
          }
        ]);
        
        // Calculate growth percentage
        const previousPeriodMessages = await Message.countDocuments({
          createdAt: {
            $lt: startDate,
            $gte: new Date(startDate.getTime() - (startDate.getTime() - new Date(0).getTime()))
          }
        });
        
        const newMessages = await Message.countDocuments({ createdAt: { $gte: startDate } });
        const messageGrowth = previousPeriodMessages > 0 ? ((newMessages / previousPeriodMessages) - 1) * 100 : 100;
        
        data = {
          data: messagesData,
          total: totalMessages,
          growth: messageGrowth
        };
        break;
        
      case 'locations':
        // Get locations data
        const locationsData = await Message.aggregate([
          {
            $match: {
              'location.latitude': { $exists: true },
              'location.longitude': { $exists: true },
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                lat: { $round: ["$location.latitude", 2] }, // More precision for better geocoding
                lng: { $round: ["$location.longitude", 2] }
              },
              count: { $sum: 1 },
              // Store a reference message id for each location group
              messageIds: { $push: "$_id" }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 20
          },
          {
            $project: {
              name: { $concat: [{ $toString: "$_id.lat" }, ", ", { $toString: "$_id.lng" }] },
              latitude: "$_id.lat",
              longitude: "$_id.lng",
              count: 1,
              // Only keep the first message ID as a reference
              sampleMessageId: { $arrayElemAt: ["$messageIds", 0] },
              _id: 0
            }
          }
        ]);
        
        const totalLocations = locationsData.length;
        
        data = {
          data: locationsData,
          total: totalLocations
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type'
        });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`Error getting admin analytics for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get settings for admin
 * @route GET /api/admin/settings
 * @access Private (Admin only)
 */
exports.getSettings = async (req, res) => {
  try {
    // For now, return mock settings since we don't have a settings model
    // In a real application, you would get this from a Settings model
    const settings = {
      siteName: "GringoX",
      siteDescription: "Connect with travelers in your area",
      contactEmail: "support@gringox.com",
      enableRegistration: true,
      enableBotCreation: true,
      maxBotsPerUser: 5,
      maxMessagesPerDay: 100,
      moderationEnabled: true,
      maintenanceMode: false
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting admin settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update settings for admin
 * @route PUT /api/admin/settings
 * @access Private (Admin only)
 */
exports.updateSettings = async (req, res) => {
  try {
    // For now, just return the settings since we don't have a settings model
    // In a real application, you would update a Settings model
    const settings = req.body;

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update user role (make admin or remove admin)
 * @route PUT /api/admin/users/:id/role
 * @access Private (Admin only)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAdmin field must be a boolean'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isAdmin },
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: `User role updated to ${isAdmin ? 'admin' : 'user'}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Get bot analytics
// @route   GET /api/admin/analytics/bots
// @access  Admin
exports.getBotAnalytics = async (req, res) => {
  try {
    const period = req.query.period || 'week';
    
    // Get date range based on period
    const endDate = new Date();
    let startDate = new Date();
    let interval = 'day';
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        interval = 'hour';
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        interval = 'day';
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        interval = 'day';
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        interval = 'month';
        break;
    }
    
    // Get bot activity data
    const botActivity = await Bot.aggregate([
      {
        $match: {
          isBot: true,
          lastActive: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: interval === 'hour' ? '%Y-%m-%d-%H' : interval === 'month' ? '%Y-%m' : '%Y-%m-%d',
              date: '$lastActive'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Get bot types distribution
    const botTypes = await Bot.aggregate([
      {
        $match: { isBot: true }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format bot types for chart
    let formattedBotTypes = botTypes.map(type => ({
      name: type._id || 'default',
      value: type.count
    }));
    
    // If no bot types data, provide sample data for development
    if (formattedBotTypes.length === 0) {
      const botUtils = require('../utils/botUtils');
      const validTypes = botUtils.VALID_BOT_TYPES;
      
      formattedBotTypes = validTypes.map(type => ({
        name: type,
        value: Math.floor(Math.random() * 5) + 1 // Random count between 1-5
      }));
    }
    
    // Format activity data for chart
    const formattedActivity = botActivity.map(item => ({
      date: item._id,
      count: item.count
    }));
    
    // Get total bot count
    const totalBots = await Bot.countDocuments({ isBot: true });
    
    // Get growth rate (comparing to previous period)
    const previousStartDate = new Date(startDate);
    if (period === 'day') {
      previousStartDate.setDate(previousStartDate.getDate() - 1);
    } else if (period === 'week') {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (period === 'month') {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    } else if (period === 'year') {
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
    }
    
    const previousPeriodBots = await Bot.countDocuments({
      isBot: true,
      createdAt: { $gte: previousStartDate, $lt: startDate }
    });
    
    const currentPeriodBots = await Bot.countDocuments({
      isBot: true,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate growth rate
    const growthRate = previousPeriodBots === 0 
      ? 100 // If no bots in previous period, growth is 100%
      : ((currentPeriodBots - previousPeriodBots) / previousPeriodBots) * 100;
    
    res.status(200).json({
      success: true,
      data: {
        data: formattedActivity,
        total: totalBots,
        growth: parseFloat(growthRate.toFixed(2)),
        byType: formattedBotTypes
      }
    });
  } catch (error) {
    console.error('Admin bot analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}; 