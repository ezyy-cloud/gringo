/**
 * Weather Bot - Alert Formatter
 * Formats alert data for posting
 */
const { logger } = require('../../utils');
const alertIcons = require('./alertIcons');

/**
 * Format a weather alert for posting
 * @param {Object} alertData - Alert data from webhook
 * @returns {Object} - Formatted alert ready for posting
 */
function formatAlertForPosting(alertData) {
  try {
    // Extract alert details
    const { 
      alert, 
      msg_type, 
      severity, 
      urgency,
      certainty,
      start,
      end,
      sender,
      description
    } = alertData;
    
    // Find the primary description (usually English)
    const primaryDesc = Array.isArray(description) && description.length > 0 
      ? description.find(d => d.language === 'En' || !d.language) || description[0]
      : null;
    
    if (!primaryDesc) {
      logger.warn('No description found in alert data');
      return createMinimalAlert(alertData);
    }
    
    // Get the appropriate icon for this alert type
    const icon = getAlertIcon(primaryDesc.event || msg_type, severity);
    
    // Format the alert title with icon
    let title = '';
    
    // Use headline if available, otherwise construct a title
    if (primaryDesc.headline) {
      title = `${icon} ${primaryDesc.headline}`;
    } else if (primaryDesc.event) {
      title = `${icon} ${primaryDesc.event} - ${severity || 'Alert'}`;
    } else {
      title = `${icon} ${severity || ''} Weather Alert`;
    }
    
    // Format the content
    let content = '';
    
    // Add event information if not already in title
    if (primaryDesc.event && !primaryDesc.headline) {
      content += `${primaryDesc.event}\n\n`;
    }
    
    // Add descriptive text
    if (primaryDesc.description) {
      content += `${primaryDesc.description}\n\n`;
    }
    
    // Add instructions if available
    if (primaryDesc.instruction) {
      content += `INSTRUCTIONS: ${primaryDesc.instruction}\n\n`;
    }
    
    // Add severity and timing information
    content += `Severity: ${severity || 'Unknown'}\n`;
    content += `Urgency: ${urgency || 'Unknown'}\n`;
    content += `Certainty: ${certainty || 'Unknown'}\n\n`;
    
    // Add time information
    if (start && end) {
      const startTime = new Date(start * 1000).toLocaleString();
      const endTime = new Date(end * 1000).toLocaleString();
      content += `Valid: ${startTime} until ${endTime}\n\n`;
    }
    
    // Add source attribution
    if (sender) {
      content += `Source: ${sender}`;
    }
    
    // Extract coordinates for location data if available
    let coordinates = null;
    if (alert && alert.geometry && alert.geometry.coordinates) {
      try {
        // Get the first point from the polygon
        if (alert.geometry.coordinates[0] && alert.geometry.coordinates[0][0]) {
          const firstPoint = alert.geometry.coordinates[0][0];
          coordinates = {
            longitude: firstPoint[0],
            latitude: firstPoint[1]
          };
          logger.info(`Extracted coordinates: ${JSON.stringify(coordinates)}`);
        }
      } catch (coordError) {
        logger.warn(`Could not extract coordinates: ${coordError.message}`);
      }
    }
    
    return {
      title,
      content,
      icon,
      severity: severity || 'Unknown',
      urgency: urgency || 'Unknown',
      certainty: certainty || 'Unknown',
      startTime: start,
      endTime: end,
      source: sender,
      alertId: alert?.id || `generated_${Date.now()}`,
      event: primaryDesc.event || 'Weather Alert',
      // Store the original alert data for use in the publisher
      alertData: alertData,
      // Include coordinates if available
      coordinates: coordinates
    };
  } catch (error) {
    logger.error(`Error formatting alert: ${error.message}`);
    return createMinimalAlert(alertData);
  }
}

/**
 * Get the appropriate icon for an alert type
 * @param {string} eventType - The type of weather event
 * @param {string} severity - The severity level
 * @returns {string} - Icon emoji
 */
function getAlertIcon(eventType, severity) {
  // Default to warning icon if no event type
  if (!eventType) {
    return severity === 'Extreme' ? '⚠️' : '⚠️';
  }
  
  // Normalize event type for matching
  const normalizedEvent = eventType.toLowerCase();
  
  // Match event type to icon
  for (const [pattern, icon] of Object.entries(alertIcons)) {
    if (normalizedEvent.includes(pattern.toLowerCase())) {
      return icon;
    }
  }
  
  // Default icons based on severity if no match found
  switch ((severity || '').toLowerCase()) {
    case 'extreme':
      return '⚠️';
    case 'severe':
      return '⚠️';
    case 'moderate':
      return '⚠️';
    case 'minor':
      return '⚠️';
    default:
      return '⚠️'; // Default warning icon
  }
}

/**
 * Create a minimal alert when normal formatting fails
 * @param {Object} alertData - Raw alert data
 * @returns {Object} - Minimally formatted alert
 */
function createMinimalAlert(alertData) {
  const icon = alertIcons.getIconForAlert('unknown', alertData.severity || 'unknown');
  const alertId = alertData.alert?.id || `minimal_${Date.now()}`;
  
  return {
    title: `${icon} ${alertData.severity || 'Weather'} Alert`,
    content: `A ${alertData.severity || ''} weather alert has been issued by ${alertData.sender || 'a weather agency'}.`,
    icon,
    severity: alertData.severity || 'Unknown',
    urgency: alertData.urgency || 'Unknown',
    certainty: alertData.certainty || 'Unknown',
    source: alertData.sender || 'Weather Agency',
    alertId
  };
}

/**
 * Format an alert for email/notifications
 * @param {Object} alertData - Alert data
 * @returns {Object} - Formatted alert for email/notification
 */
function formatAlertForNotification(alertData) {
  try {
    const formattedAlert = formatAlertForPosting(alertData);
    
    // Create a shorter version for notifications
    const shortTitle = formattedAlert.title.length > 100 
      ? formattedAlert.title.substring(0, 97) + '...'
      : formattedAlert.title;
      
    // Create a shortened content for notification body
    let shortContent = '';
    
    // Add event type
    if (formattedAlert.event) {
      shortContent += formattedAlert.event;
    }
    
    // Add severity if not in event
    if (!shortContent.toLowerCase().includes(formattedAlert.severity.toLowerCase())) {
      shortContent += ` (${formattedAlert.severity})`;
    }
    
    // Add area info if available
    const description = alertData.description?.[0]?.description;
    if (description && description.includes('WHERE')) {
      const whereMatch = description.match(/WHERE\.\.\.(.*?)(?:WHEN|IMPACTS|\*|$)/s);
      if (whereMatch && whereMatch[1]) {
        shortContent += ` for ${whereMatch[1].trim()}`;
      }
    }
    
    return {
      ...formattedAlert,
      shortTitle,
      shortContent
    };
  } catch (error) {
    logger.error(`Error formatting alert for notification: ${error.message}`);
    const formattedAlert = createMinimalAlert(alertData);
    return {
      ...formattedAlert,
      shortTitle: formattedAlert.title,
      shortContent: formattedAlert.content
    };
  }
}

module.exports = {
  formatAlertForPosting,
  formatAlertForNotification,
  createMinimalAlert
}; 