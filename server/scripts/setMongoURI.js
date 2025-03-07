// This script makes a user an admin using a directly specified MongoDB URI
// Usage: node setMongoURI.js username
const mongoose = require('mongoose');

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Please provide a username: node setMongoURI.js username');
  process.exit(1);
}

// ==========================================
// SET YOUR MONGODB CONNECTION STRING HERE
// ==========================================
const MONGODB_URI = 'mongodb+srv://YOUR_ACTUAL_CONNECTION_STRING';
// ==========================================

console.log(`Attempting to connect to MongoDB...`);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
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
        bio: String,
        isOnline: Boolean,
        lastSeen: Date,
        createdAt: Date,
        // Other fields can be omitted for this operation
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
      
      console.log(`Found user: ${username}`);
      console.log(`Current admin status: ${user.isAdmin || false}`);
      
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