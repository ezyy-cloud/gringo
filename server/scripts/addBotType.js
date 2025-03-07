/**
 * Migration script to add type field to existing bots
 * 
 * This script adds a default 'type' field to all existing bots 
 * that don't have one, to ensure compatibility with the bot microservice.
 */

const mongoose = require('mongoose');
const Bot = require('../models/Bot');

async function addTypeToExistingBots() {
  try {
    // Find all bots without a type field
    const bots = await Bot.find({ type: { $exists: false } });
    
    console.log(`Found ${bots.length} bots without a type field`);
    
    // Update each bot
    for (const bot of bots) {
      // Set a default type based on the bot's purpose or capabilities
      let defaultType = 'echo';
      
      // Try to infer type from purpose or capabilities
      if (bot.purpose && bot.purpose.toLowerCase().includes('notification')) {
        defaultType = 'notification';
      } else if (bot.capabilities && bot.capabilities.includes('commandProcessing')) {
        defaultType = 'command';
      }
      
      // Update the bot
      await Bot.findByIdAndUpdate(bot._id, { type: defaultType });
      
      console.log(`Added type '${defaultType}' to bot ${bot.username} (${bot._id})`);
    }
    
    console.log('Migration completed successfully');
    return { success: true, count: bots.length };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// If script is run directly
if (require.main === module) {
  // Connect to MongoDB using the server's mongoose connection
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(async () => {
    console.log('Connected to MongoDB');
    const result = await addTypeToExistingBots();
    console.log(result);
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
}

module.exports = addTypeToExistingBots; 