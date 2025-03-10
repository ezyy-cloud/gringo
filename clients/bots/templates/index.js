/**
 * Bot Templates Index
 * 
 * This file is responsible for registering all bot templates with the BotFactory.
 * It scans the templates directory for subdirectories, each containing a bot template.
 */
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils');

/**
 * Register all bot templates with the BotFactory
 * @param {Object} botFactory - The BotFactory instance
 * @returns {Number} - The number of templates registered
 */
function registerTemplates(botFactory) {
  // Get the templates directory path
  const templatesDir = path.join(__dirname);
  
  // Get all subdirectories in the templates directory
  const templateDirs = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'utilities')
    .map(dirent => dirent.name);
  
  logger.info('TEMPLATE DIRECTORIES FOUND:', templateDirs);
  
  // Register each template
  let registeredCount = 0;
  
  for (const dirName of templateDirs) {
    try {
      // Get the template module
      const templatePath = path.join(templatesDir, dirName);
      const templateName = dirName.replace(/Bot$/i, '').toLowerCase();
      
      // Skip if no index.js file
      if (!fs.existsSync(path.join(templatePath, 'index.js'))) {
        continue;
      }
      
      // Require the template module
      const template = require(path.join(templatePath));
      
      // Log template details
      logger.info(`LOADING TEMPLATE ${templateName}:`, {
        name: template.name,
        description: template.description,
        hasInitialize: typeof template.initialize === 'function'
      });
      
      // Register the template with the BotFactory
      botFactory.registerBotTemplate(templateName, template);
      registeredCount++;
      
      // Special case for newsBot - also register as 'news'
      if (dirName === 'newsBot' && templateName !== 'news') {
        logger.info(`Ensuring newsBot is also registered as 'news' template`);
        botFactory.registerBotTemplate('news', template);
      }
      
      // Special case for moderatorBot - also register as 'moderator'
      if (dirName === 'moderatorBot' && templateName !== 'moderator') {
        logger.info(`Ensuring moderatorBot is also registered as 'moderator' template`);
        botFactory.registerBotTemplate('moderator', template);
      }
    } catch (error) {
      logger.error(`ERROR REGISTERING TEMPLATE ${dirName}:`, error);
    }
  }
  
  // Log registered templates
  logger.info('REGISTERED TEMPLATES:', Array.from(botFactory.botTemplates.keys()));
  logger.info('TEMPLATE DETAILS:');
  for (const [name, template] of botFactory.botTemplates.entries()) {
    logger.info(`- ${name}: ${template.name || name}`);
  }
  
  return registeredCount;
}

module.exports = registerTemplates; 