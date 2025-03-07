const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Please provide a username: node makeAdmin.js username');
  process.exit(1);
}

// For debugging
console.log('MongoDB URI:', process.env.MONGODB_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    
    try {
      // Find the user by username
      const user = await User.findOne({ username });
      
      if (!user) {
        console.error(`User '${username}' not found`);
        process.exit(1);
      }
      
      // Make user an admin
      user.isAdmin = true;
      await user.save();
      
      console.log(`User '${username}' is now an admin`);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      // Close the MongoDB connection
      await mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }); 