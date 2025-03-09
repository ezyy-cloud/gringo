/**
 * Bot Templates Registration
 * 
 * This file handles the registration of all bot templates with the BotFactory.
 * Templates are loaded dynamically from individual directories in the templates directory.
 */
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils');

/**
 * Register all bot templates with the BotFactory
 * @param {Object} botFactory - Instance of the BotFactory class
 * @returns {number} - Number of templates registered
 */
function registerTemplates(botFactory) {
  let registeredCount = 0;
  
  // Get the templates directory path
  const templatesDir = path.join(__dirname);
  
  try {
    // Get all directory entries
    const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
    
    // Filter for directories that end with 'Bot' and have an index.js file
    const templateDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.endsWith('Bot'))
      .map(dir => dir.name);
    
    logger.info(`Found ${templateDirs.length} template directories in ${templatesDir}`);
    console.log('TEMPLATE DIRECTORIES FOUND:', templateDirs);
    
    // Register each template
    templateDirs.forEach(dirName => {
      try {
        // Get template name without the 'Bot' suffix
        const templateName = dirName.replace(/Bot$/, '').toLowerCase();
        
        // Require the template file (index.js in the directory)
        const templatePath = path.join(templatesDir, dirName, 'index.js');
        
        if (!fs.existsSync(templatePath)) {
          logger.warn(`No index.js found in template directory: ${dirName}`);
          return;
        }
        
        const template = require(templatePath);
        
        console.log(`LOADING TEMPLATE ${templateName}:`, {
          name: template.name,
          description: template.description,
          hasInitialize: typeof template.initialize === 'function'
        });
        
        // Register the template with its name
        botFactory.registerBotTemplate(templateName, template);
        
        // Special case for newsBot - ensure it's also registered as 'news'
        if (dirName === 'newsBot' && templateName !== 'news') {
          console.log(`Ensuring newsBot is also registered as 'news' template`);
          botFactory.registerBotTemplate('news', template);
        }
        
        logger.info(`Registered bot template: ${templateName}`);
        registeredCount++;
      } catch (error) {
        logger.error(`Failed to register template ${dirName}`, error);
        console.error(`ERROR REGISTERING TEMPLATE ${dirName}:`, error);
      }
    });
    
    // Register legacy templates for backward compatibility
    registerLegacyTemplates(botFactory, templateDirs);
    
    // Log the final templates collection
    console.log('REGISTERED TEMPLATES:', Array.from(botFactory.botTemplates.keys()));
    console.log('TEMPLATE DETAILS:');
    for (const [name, template] of botFactory.botTemplates.entries()) {
      console.log(`- ${name}: ${template.name || name}`);
    }
    
    if (registeredCount === 0) {
      logger.warn('No templates were registered. Check the templates directory.');
    }
    
  } catch (error) {
    logger.error('Error loading template files', error);
  }
  
  return registeredCount;
}

/**
 * Register legacy templates for backward compatibility
 * @param {Object} botFactory - Instance of the BotFactory class
 * @param {Array} templateDirs - Array of template directories already processed
 */
function registerLegacyTemplates(botFactory, templateDirs) {
  // Get the templates directory path
  const templatesDir = path.join(__dirname);
  
  try {
    // Read all JS files in the root templates directory (excluding index.js)
    const legacyTemplateFiles = fs.readdirSync(templatesDir)
      .filter(file => file !== 'index.js' && file.endsWith('.js'));
    
    if (legacyTemplateFiles.length > 0) {
      logger.info(`Found ${legacyTemplateFiles.length} legacy template files`);
      
      // Register each legacy template
      legacyTemplateFiles.forEach(file => {
        try {
          // Get template name from filename without extension
          const templateName = path.basename(file, '.js');
          
          // Require the template file
          const template = require(path.join(templatesDir, file));
          
          // Register the template if not already registered
          if (!botFactory.botTemplates.has(templateName)) {
            botFactory.registerBotTemplate(templateName, template);
            logger.info(`Registered legacy bot template: ${templateName}`);
          }
        } catch (error) {
          logger.error(`Failed to register legacy template ${file}`, error);
        }
      });
    }
  } catch (error) {
    logger.error('Error loading legacy template files', error);
  }
}

module.exports = registerTemplates; 