/**
 * Bot Templates Registration
 * 
 * This file handles the registration of all bot templates with the BotFactory.
 * Templates are loaded dynamically from individual files in the templates directory.
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
    // Read all template files (excluding this index.js file)
    const templateFiles = fs.readdirSync(templatesDir)
      .filter(file => file !== 'index.js' && file.endsWith('.js'));
    
    logger.info(`Found ${templateFiles.length} template files in ${templatesDir}`);
    console.log('TEMPLATE FILES FOUND:', templateFiles);
    
    // Register each template
    templateFiles.forEach(file => {
      try {
        // Get template name from filename without extension
        const templateName = path.basename(file, '.js');
        
        // Require the template file
        const template = require(path.join(templatesDir, file));
        console.log(`LOADING TEMPLATE ${templateName}:`, {
          name: template.name,
          description: template.description,
          hasInitialize: typeof template.initialize === 'function'
        });
        
        // Register the template with its name
        botFactory.registerBotTemplate(templateName, template);
        
        logger.info(`Registered bot template: ${templateName}`);
        registeredCount++;
      } catch (error) {
        logger.error(`Failed to register template ${file}`, error);
        console.error(`ERROR REGISTERING TEMPLATE ${file}:`, error);
      }
    });
    
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

module.exports = registerTemplates; 