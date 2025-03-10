/**
 * Message Routes
 */
const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../middleware');
const config = require('../config');
const axios = require('axios');
const { logger } = require('../utils');

module.exports = (botFactory) => {
  /**
   * @route POST /api/messages/receive
   * @description Receive messages from the main server
   */
  router.post('/receive', validateApiKey, async (req, res) => {
    try {
      const { botId, message } = req.body;
      
      if (!botId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Bot ID and message are required'
        });
      }
      
      // Find the bot
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Bot with ID ${botId} not found or inactive`
        });
      }
      
      // Process the message using the bot's handlers
      if (bot.messageHandlers && bot.messageHandlers.length > 0) {
        for (const handler of bot.messageHandlers) {
          await handler(message);
        }
      } else if (typeof bot.processMessage === 'function') {
        await bot.processMessage(message);
      } else {
        return res.status(400).json({
          success: false,
          message: `Bot ${botId} does not have message handlers`
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Message processed successfully'
      });
    } catch (error) {
      logger.error('Error processing message:', error);
      return res.status(500).json({
        success: false,
        message: `Error processing message: ${error.message}`
      });
    }
  });
  
  /**
   * @route POST /api/messages/send
   * @description Send a message from a bot to the main server
   */
  router.post('/send', validateApiKey, async (req, res) => {
    try {
      const { botId, content, recipient } = req.body;
      
      if (!botId || !content || !recipient) {
        return res.status(400).json({
          success: false,
          message: 'Bot ID, content, and recipient are required'
        });
      }
      
      // Find the bot
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Bot with ID ${botId} not found or inactive`
        });
      }
      
      // Send the message
      if (typeof bot.sendMessage === 'function') {
        const result = await bot.sendMessage(content, recipient);
        
        return res.status(200).json({
          success: true,
          message: 'Message sent successfully',
          result
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Bot ${botId} does not have a sendMessage method`
        });
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        message: `Error sending message: ${error.message}`
      });
    }
  });
  
  return router;
}; 