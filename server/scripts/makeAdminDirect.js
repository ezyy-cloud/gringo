// This script makes a user an admin by connecting directly to MongoDB
// Usage: node makeAdminDirect.js username
const mongoose = require('mongoose');
const path = require('path');

// First try to load from .env file
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (error) {
  console.log('Error loading .env file, continuing with defaults');
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Please provide a username: node makeAdminDirect.js username');
  process.exit(1);
}

// Hard-coded MongoDB URI as fallback
// You can replace this with your actual MongoDB connection string if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:password@cluster.mongodb.net/database?retryWrites=true&w=majority';

console.log(`Attempting to connect to MongoDB with URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

// Connect to MongoDB with same options as server.js
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
})
  .then(async () => {
    console.log('MongoDB Connected');
    
    try {
      // Define User schema here to avoid import issues
      const UserSchema = new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        isAdmin: Boolean,
        profilePicture: String,
        coverColor: String,
        bio: String,
        isOnline: Boolean,
        darkMode: Boolean,
        lastSeen: Date,
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        messages: [mongoose.Schema.Types.ObjectId],
        followers: [mongoose.Schema.Types.ObjectId],
        following: [mongoose.Schema.Types.ObjectId],
        likedMessages: [mongoose.Schema.Types.ObjectId],
        createdAt: Date
      });
      
      // Try to get the User model if already registered, otherwise create it
      let User;
      try {
        User = mongoose.model('User');
      } catch (e) {
        User = mongoose.model('User', UserSchema);
      }
      
      // Find the user by username
      const user = await User.findOne({ username });
      
      if (!user) {
        console.error(`User '${username}' not found`);
        process.exit(1);
      }
      
      // Current admin status
      console.log(`Current admin status for ${username}: ${user.isAdmin || false}`);
      
      // Make user an admin
      user.isAdmin = true;
      await user.save();
      
      console.log(`User '${username}' is now an admin`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      // Close the MongoDB connection
      await mongoose.connection.close();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }); 