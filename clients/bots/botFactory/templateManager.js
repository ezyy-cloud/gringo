/**
 * Template Manager Module
 * 
 * Contains methods for managing bot templates:
 * - Registering templates
 * - Retrieving templates
 * - Validating templates
 */

/**
 * Register a new bot template
 * @param {Map} botTemplates - Reference to the templates collection
 * @param {string} type - Template type/name
 * @param {object} template - Template configuration
 */
function registerBotTemplate(botTemplates, type, template) {
  if (botTemplates.has(type)) {
    console.warn(`Bot template "${type}" already exists, overwriting`);
  }
  
  botTemplates.set(type, template);
  console.log(`Registered bot template: ${type}`);
}

/**
 * Get a registered bot template
 * @param {Map} botTemplates - Reference to the templates collection
 * @param {string} type - Template type/name
 * @param {boolean} [validate=false] - Whether to validate and throw errors
 * @returns {object|null} The template or null if not found and validate is false
 */
function getBotTemplate(botTemplates, type, validate = false) {
  const template = botTemplates.get(type);
  
  if (validate) {
    console.log(`Looking for bot template: "${type}"`);
    console.log(`Available templates: ${Array.from(botTemplates.keys()).join(', ') || 'none'}`);
    
    if (!template) {
      throw new Error(`Bot template "${type}" not found`);
    }
    
    if (typeof template.initialize !== 'function') {
      throw new Error(`Bot template "${type}" does not have an initialize function`);
    }
  }
  
  return template || null;
}

/**
 * Get all registered bot templates
 * @param {Map} botTemplates - Reference to the templates collection
 * @returns {Map} Map of bot templates
 */
function getBotTemplates(botTemplates) {
  return botTemplates;
}

module.exports = {
  registerBotTemplate,
  getBotTemplate,
  getBotTemplates
}; 