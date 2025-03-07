/**
 * Update the test bot with type field
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
console.log('MongoDB URI:', MONGODB_URI ? 'Found' : 'Not found');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');

  // Import Bot model after connection to avoid errors
  const Bot = require('../models/Bot');
  
  try {
    // Update the specific test bot
    const botId = '67c89847ea12c6554a61d7cf'; // Your test bot ID
    
    const bot = await Bot.findById(botId);
    
    if (!bot) {
      console.error('Bot not found!');
      process.exit(1);
    }
    
    // Update with type field
    bot.type = 'echo';
    await bot.save();
    
    console.log('Updated bot:', bot);
    console.log('Bot type updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating bot:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
}); 