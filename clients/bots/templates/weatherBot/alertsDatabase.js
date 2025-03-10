const mongoose = require('mongoose');
const { logger } = require('../../utils');

// Define the Alert Schema
const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  rawData: { type: Object }, // Store the complete alert data
  alert: {
    id: { type: String },
    geometry: {
      type: { type: String, enum: ['Polygon', 'MultiPolygon'] },
      coordinates: [[[]]] // Array of arrays of arrays for coordinates
    }
  },
  msg_type: { type: String, default: 'warning' },
  categories: [{ type: String }],
  urgency: { 
    type: String, 
    enum: ['Immediate', 'Expected', 'Future', 'Past', 'Unknown'],
    default: 'Unknown'
  },
  severity: {
    type: String,
    enum: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'],
    default: 'Unknown'
  },
  certainty: {
    type: String,
    enum: ['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown'],
    default: 'Unknown'
  },
  start: { type: Number }, // Unix timestamp
  end: { type: Number },   // Unix timestamp
  sender: { type: String },
  description: [{
    language: { type: String },
    event: { type: String },
    headline: { type: String },
    description: { type: String },
    instruction: { type: String }
  }],
  processed: { type: Boolean, default: false },
  processedAt: { type: Date },
  processStatus: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create the Alert model if it doesn't exist
let Alert;
try {
  Alert = mongoose.model('Alert');
} catch (error) {
  Alert = mongoose.model('Alert', alertSchema);
}

// Define the Bot Configuration Schema
const botConfigSchema = new mongoose.Schema({
  botId: { type: String, required: true, unique: true },
  minSeverity: { 
    type: String, 
    enum: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'],
    default: 'Moderate'
  },
  useCommonChannel: { type: Boolean, default: true },
  globalAlertDelivery: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

// Create the BotConfig model if it doesn't exist
let BotConfig;
try {
  BotConfig = mongoose.model('BotConfig');
} catch (error) {
  BotConfig = mongoose.model('BotConfig', botConfigSchema);
}

// Define the User Preferences Schema for alerts
const userPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    name: { type: String }
  },
  minSeverity: { 
    type: String, 
    enum: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'],
    default: 'Moderate'
  },
  alertTypes: [{ type: String }], // Array of alert types the user wants
  receiveGlobalAlerts: { type: Boolean, default: false },
  mutedSenders: [{ type: String }], // Senders to ignore
  updatedAt: { type: Date, default: Date.now }
});

// Create the UserPreferences model if it doesn't exist
let UserPreferences;
try {
  UserPreferences = mongoose.model('UserPreferences');
} catch (error) {
  UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);
}

/**
 * Save an alert to the database
 * @param {Object} alertData - The alert data to save
 * @returns {Promise<Object>} - The saved alert
 */
async function saveAlert(alertData) {
  try {
    // Create alertId from the alert.id if exists, otherwise generate one
    const alertId = alertData.alert?.id || `generated_${Date.now()}`;
    
    // Check if alert already exists
    let alert = await Alert.findOne({ alertId });
    
    if (alert) {
      // Update existing alert
      alert.rawData = alertData;
      alert.alert = alertData.alert;
      alert.msg_type = alertData.msg_type;
      alert.categories = alertData.categories;
      alert.urgency = alertData.urgency;
      alert.severity = alertData.severity;
      alert.certainty = alertData.certainty;
      alert.start = alertData.start;
      alert.end = alertData.end;
      alert.sender = alertData.sender;
      alert.description = alertData.description;
      await alert.save();
      logger.info(`Updated existing alert: ${alertId}`);
    } else {
      // Create new alert
      alert = new Alert({
        alertId,
        rawData: alertData,
        alert: alertData.alert,
        msg_type: alertData.msg_type,
        categories: alertData.categories,
        urgency: alertData.urgency,
        severity: alertData.severity,
        certainty: alertData.certainty,
        start: alertData.start,
        end: alertData.end,
        sender: alertData.sender,
        description: alertData.description
      });
      await alert.save();
      logger.info(`Saved new alert: ${alertId}`);
    }
    
    return alert;
  } catch (error) {
    logger.error(`Error saving alert to database: ${error.message}`);
    throw error;
  }
}

/**
 * Get an alert by its ID
 * @param {string} alertId - The alert ID
 * @returns {Promise<Object|null>} - The alert or null if not found
 */
async function getAlertById(alertId) {
  try {
    return await Alert.findOne({ alertId });
  } catch (error) {
    logger.error(`Error getting alert ${alertId}: ${error.message}`);
    throw error;
  }
}

/**
 * Mark an alert as processed
 * @param {string} alertId - The alert ID
 * @param {string} status - Processing status
 * @returns {Promise<Object>} - The updated alert
 */
async function markAlertAsProcessed(alertId, status = 'processed') {
  try {
    const result = await Alert.findOneAndUpdate(
      { alertId },
      { 
        processed: true, 
        processedAt: new Date(),
        processStatus: status
      },
      { new: true }
    );
    
    logger.info(`Marked alert ${alertId} as processed with status: ${status}`);
    return result;
  } catch (error) {
    logger.error(`Error marking alert ${alertId} as processed: ${error.message}`);
    throw error;
  }
}

/**
 * Get all active alerts (not expired)
 * @returns {Promise<Array>} - Array of active alerts
 */
async function getActiveAlerts() {
  try {
    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    return await Alert.find({
      end: { $gt: now } // End time is greater than current time
    }).sort({ start: 1 });
  } catch (error) {
    logger.error(`Error getting active alerts: ${error.message}`);
    throw error;
  }
}

/**
 * Get the bot configuration
 * @param {string} botId - The bot ID
 * @returns {Promise<Object|null>} - The bot configuration or null
 */
async function getBotConfiguration(botId = 'weatherBot') {
  try {
    let config = await BotConfig.findOne({ botId });
    
    if (!config) {
      // Create default configuration
      config = new BotConfig({
        botId,
        minSeverity: 'Moderate',
        useCommonChannel: true,
        globalAlertDelivery: true
      });
      await config.save();
      logger.info(`Created default configuration for bot: ${botId}`);
    }
    
    return config;
  } catch (error) {
    logger.error(`Error getting bot configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Update the bot configuration
 * @param {string} botId - The bot ID
 * @param {Object} config - The new configuration
 * @returns {Promise<Object>} - The updated configuration
 */
async function updateBotConfiguration(botId, config) {
  try {
    const result = await BotConfig.findOneAndUpdate(
      { botId },
      { 
        ...config,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    logger.info(`Updated configuration for bot: ${botId}`);
    return result;
  } catch (error) {
    logger.error(`Error updating bot configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Get users who have global alerts enabled
 * @returns {Promise<Array>} - Array of users
 */
async function getUsersWithGlobalAlerts() {
  try {
    return await UserPreferences.find({ receiveGlobalAlerts: true });
  } catch (error) {
    logger.error(`Error getting users with global alerts: ${error.message}`);
    throw error;
  }
}

/**
 * Get all user locations for checking against alert geometries
 * @returns {Promise<Array>} - Array of user location objects
 */
async function getAllUserLocations() {
  try {
    const users = await UserPreferences.find({ 
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });
    
    return users.map(user => ({
      userId: user.userId,
      location: user.location,
      preferences: {
        minSeverity: user.minSeverity,
        alertTypes: user.alertTypes,
        mutedSenders: user.mutedSenders
      }
    }));
  } catch (error) {
    logger.error(`Error getting all user locations: ${error.message}`);
    throw error;
  }
}

/**
 * Update or create user preferences
 * @param {string} userId - The user ID
 * @param {Object} preferences - The user preferences
 * @returns {Promise<Object>} - The updated preferences
 */
async function updateUserPreferences(userId, preferences) {
  try {
    const result = await UserPreferences.findOneAndUpdate(
      { userId },
      { 
        ...preferences,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    logger.info(`Updated preferences for user: ${userId}`);
    return result;
  } catch (error) {
    logger.error(`Error updating user preferences: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveAlert,
  getAlertById,
  markAlertAsProcessed,
  getActiveAlerts,
  getBotConfiguration,
  updateBotConfiguration,
  getUsersWithGlobalAlerts,
  getAllUserLocations,
  updateUserPreferences
}; 