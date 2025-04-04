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
    },
    fuzzyLocation: {
      type: Boolean,
      default: true
    }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0,
    get: function() {
      return this.likes ? this.likes.length : 0;
    }
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
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.createdAt) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      
      // Calculate likes count from the likes array
      ret.likesCount = ret.likes ? ret.likes.length : 0;
      
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      if (ret.createdAt) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      
      // Calculate likes count from the likes array
      ret.likesCount = ret.likes ? ret.likes.length : 0;
      
      return ret;
    }
  }
});

// Virtual for likesCount
MessageSchema.virtual('totalLikes').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Pre-save middleware to update likesCount
MessageSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

// Create a compound index for userId and createdAt for faster timeline queries
MessageSchema.index({ userId: 1, createdAt: -1 });

// Create a geospatial index if location queries are important
MessageSchema.index({ 
  'location.longitude': 1, 
  'location.latitude': 1 
});

module.exports = mongoose.model('Message', MessageSchema); 