const mongoose = require('mongoose');
const User = require('./User');
const botUtils = require('../utils/botUtils');

const BotSchema = new mongoose.Schema({
  isBot: {
    type: Boolean,
    default: true,
    immutable: true
  },
  type: {
    type: String,
    required: [true, 'Bot type is required'],
    trim: true,
    enum: {
      values: botUtils.VALID_BOT_TYPES,
      message: `Bot type must be one of: ${botUtils.VALID_BOT_TYPES.join(', ')}`
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bot creator is required']
  },
  purpose: {
    type: String,
    required: [true, 'Bot purpose is required'],
    maxlength: [200, 'Purpose cannot be more than 200 characters long']
  },
  apiKey: {
    type: String,
    required: true,
    select: false // Don't return API key in queries by default
  },
  capabilities: [{
    type: String,
    enum: ['messaging', 'notifications', 'eventResponse', 'commandProcessing', 'userInteraction']
  }],
  status: {
    type: String,
    enum: {
      values: botUtils.VALID_BOT_STATUSES,
      message: `Bot status must be one of: ${botUtils.VALID_BOT_STATUSES.join(', ')}`
    },
    required: [true, 'Bot status is required']
  },
  config: {
    type: mongoose.Schema.Types.Mixed, // Flexible configuration object for bot settings
    default: {}
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  webhookUrl: {
    type: String,
    default: null
  },
  rateLimits: {
    messagesPerMinute: {
      type: Number,
      default: 10
    },
    actionsPerHour: {
      type: Number,
      default: 100
    }
  }
});

// Generate a new API key for the bot
BotSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  const apiKey = crypto.randomBytes(32).toString('hex');
  this.apiKey = apiKey;
  return apiKey;
};

// Verify an API key
BotSchema.methods.verifyApiKey = function(candidateApiKey) {
  return this.apiKey === candidateApiKey;
};

// Update last active timestamp
BotSchema.methods.updateActivity = function() {
  this.lastActive = Date.now();
  return this.save();
};

// Ensure the user is marked as a bot
BotSchema.pre('save', function(next) {
  this.isBot = true;
  next();
});

module.exports = User.discriminator('Bot', BotSchema); 