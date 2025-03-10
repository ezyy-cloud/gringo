/**
 * Weather Bot - Alert Icons
 * Maps weather alert types to appropriate icons
 */

/**
 * Map of alert types to icons
 * Using emoji for maximum compatibility
 */
const alertIconMap = {
  // Weather events
  'tornado': '🌪️',
  'tornado warning': '🌪️',
  'tornado watch': '🌪️',
  'thunderstorm': '⛈️',
  'severe thunderstorm': '⛈️',
  'thunderstorm warning': '⛈️',
  'flash flood': '🌊',
  'flood': '🌊',
  'flood warning': '🌊',
  'flood watch': '🌊',
  'winter storm': '❄️',
  'winter storm warning': '❄️',
  'winter storm watch': '❄️',
  'blizzard': '❄️',
  'blizzard warning': '❄️',
  'snow': '❄️',
  'heavy snow': '❄️',
  'ice': '🧊',
  'ice storm': '🧊',
  'freeze': '🥶',
  'freeze warning': '🥶',
  'frost': '🥶',
  'frost advisory': '🥶',
  'wind': '💨',
  'high wind': '💨',
  'wind advisory': '💨',
  'high wind warning': '💨',
  'hurricane': '🌀',
  'hurricane warning': '🌀',
  'hurricane watch': '🌀',
  'tropical storm': '🌀',
  'tropical storm warning': '🌀',
  'tropical storm watch': '🌀',
  'typhoon': '🌀',
  'cyclone': '🌀',
  'tsunami': '🌊',
  'tsunami warning': '🌊',
  'tsunami watch': '🌊',
  'dust storm': '💨',
  'dust advisory': '💨',
  'sandstorm': '💨',
  'heat': '🔥',
  'extreme heat': '🔥',
  'excessive heat': '🔥',
  'heat advisory': '🔥',
  'heatwave': '🔥',
  'drought': '☀️',
  'wildfire': '🔥',
  'fire weather': '🔥',
  'red flag warning': '🔥',
  'avalanche': '⛰️',
  'avalanche warning': '⛰️',
  'volcano': '🌋',
  'volcanic activity': '🌋',
  'earthquake': '🔆',
  'air quality': '😷',
  'air quality alert': '😷',
  'pollution': '😷',
  'dense fog': '🌫️',
  'fog': '🌫️',
  'dense fog advisory': '🌫️',
  'marine': '⚓',
  'marine warning': '⚓',
  'small craft advisory': '⚓',
  'coastal flood': '🌊',
  'coastal flood warning': '🌊',
  'rip current': '🌊',
  'rip current statement': '🌊',
  'lightning': '⚡',
  'hail': '🧊',
  'severe weather': '⚠️',
  
  // Generic by severity
  'warning': '⚠️',
  'watch': '👁️',
  'advisory': 'ℹ️',
  'statement': 'ℹ️',
  'extreme': '‼️',
  'severe': '⚠️',
  'moderate': '⚠️',
  'minor': 'ℹ️',
  'unknown': '⚠️',
  
  // Default
  'default': '⚠️'
};

/**
 * Get the appropriate icon for an alert type and severity
 * @param {string} eventType - The type of weather event
 * @param {string} severity - The severity level
 * @returns {string} - The icon to use
 */
function getIconForAlert(eventType, severity) {
  if (!eventType && !severity) {
    return alertIconMap.default;
  }
  
  // Convert to lowercase for matching
  const eventLower = (eventType || '').toLowerCase();
  const severityLower = (severity || '').toLowerCase();
  
  // Try to match by event type first
  for (const [key, icon] of Object.entries(alertIconMap)) {
    if (eventLower.includes(key)) {
      return icon;
    }
  }
  
  // If no match by event type, use severity
  if (alertIconMap[severityLower]) {
    return alertIconMap[severityLower];
  }
  
  // Default icon
  return alertIconMap.default;
}

module.exports = {
  getIconForAlert,
  alertIconMap
}; 