const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: [true, 'Message ID is required'],
    unique: true,
    index: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true
  },
  image: {
    type: String,
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  senderUsername: {
    type: String,
    required: [true, 'Sender username is required']
  },
  isApiMessage: {
    type: Boolean,
    default: false
  },
  location: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  sequence: {
    type: Number,
    default: 0
  },
  isResend: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: function(doc, ret) {
      if (ret.createdAt) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      return ret;
    }
  }
});

// Create a compound index for userId and createdAt for faster timeline queries
MessageSchema.index({ userId: 1, createdAt: -1 });

// Create a geospatial index if location queries are important
MessageSchema.index({ 
  'location.longitude': 1, 
  'location.latitude': 1 
});

module.exports = mongoose.model('Message', MessageSchema); 