/**
 * Weather Bot - Mock Data Generator
 * Generates mock weather alert data for testing
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a mock polygon for testing
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} size - Size of polygon in degrees
 * @returns {Array} - Array of coordinates
 */
function generateMockPolygon(lat = 40.7128, lon = -74.0060, size = 0.5) {
  return [
    [
      [lon - size, lat - size],
      [lon + size, lat - size],
      [lon + size, lat + size],
      [lon - size, lat + size],
      [lon - size, lat - size] // Close the polygon
    ]
  ];
}

/**
 * Generate a mock multipolygon for testing
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @returns {Array} - Array of polygons
 */
function generateMockMultiPolygon(lat = 40.7128, lon = -74.0060) {
  return [
    // First polygon
    [
      [lon - 0.5, lat - 0.5],
      [lon + 0.5, lat - 0.5],
      [lon + 0.5, lat + 0.5],
      [lon - 0.5, lat + 0.5],
      [lon - 0.5, lat - 0.5]
    ],
    // Second polygon
    [
      [lon - 0.3, lat + 0.7],
      [lon + 0.3, lat + 0.7],
      [lon + 0.3, lat + 1.0],
      [lon - 0.3, lat + 1.0],
      [lon - 0.3, lat + 0.7]
    ]
  ];
}

// Alert types for mock data
const alertTypes = [
  { event: 'Tornado Warning', severity: 'Extreme', urgency: 'Immediate' },
  { event: 'Severe Thunderstorm Warning', severity: 'Severe', urgency: 'Immediate' },
  { event: 'Flash Flood Warning', severity: 'Severe', urgency: 'Immediate' },
  { event: 'Flood Warning', severity: 'Moderate', urgency: 'Expected' },
  { event: 'Winter Storm Warning', severity: 'Severe', urgency: 'Expected' },
  { event: 'Blizzard Warning', severity: 'Extreme', urgency: 'Expected' },
  { event: 'Hurricane Warning', severity: 'Extreme', urgency: 'Expected' },
  { event: 'Tropical Storm Warning', severity: 'Severe', urgency: 'Expected' },
  { event: 'Heat Advisory', severity: 'Moderate', urgency: 'Expected' },
  { event: 'Air Quality Alert', severity: 'Minor', urgency: 'Expected' },
  { event: 'Tornado Watch', severity: 'Moderate', urgency: 'Future' },
  { event: 'Severe Thunderstorm Watch', severity: 'Moderate', urgency: 'Future' },
  { event: 'Flood Watch', severity: 'Minor', urgency: 'Future' },
  { event: 'Winter Storm Watch', severity: 'Minor', urgency: 'Future' }
];

// Alert sources for mock data
const alertSources = [
  'NWS New York, NY',
  'NWS Chicago, IL',
  'NWS Los Angeles, CA',
  'NWS Houston, TX',
  'NWS Miami, FL',
  'NWS Seattle, WA',
  'NWS Denver, CO',
  'NWS Phoenix, AZ',
  'UK Met Office',
  'Environment Canada',
  'Australian Bureau of Meteorology',
  'Japan Meteorological Agency',
  'MeteoFrance'
];

/**
 * Generate a random mock alert
 * @param {Object} options - Alert generation options
 * @returns {Object} - Mock alert data
 */
function generateMockAlert(options = {}) {
  // Generate unique ID
  const alertId = options.alertId || `mock-alert-${uuidv4()}`;
  
  // Select a random alert type
  const alertType = options.alertType || 
    alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
  // Select a random source
  const source = options.source || 
    alertSources[Math.floor(Math.random() * alertSources.length)];
  
  // Generate timestamps
  const now = Math.floor(Date.now() / 1000);
  const start = options.start || now;
  const end = options.end || (start + 3600 * 6); // 6 hours from start
  
  // Generate mock location
  const lat = options.latitude || 40.7128; // New York by default
  const lon = options.longitude || -74.0060;
  
  // Determine geometry type
  const useMultiPolygon = options.useMultiPolygon || (Math.random() > 0.7);
  const geometryType = useMultiPolygon ? 'MultiPolygon' : 'Polygon';
  const coordinates = useMultiPolygon 
    ? generateMockMultiPolygon(lat, lon)
    : generateMockPolygon(lat, lon);
  
  // Build the mock alert
  return {
    alert: {
      id: alertId,
      geometry: {
        type: geometryType,
        coordinates
      }
    },
    msg_type: options.msgType || 'warning',
    categories: options.categories || ['Met'],
    urgency: alertType.urgency,
    severity: alertType.severity,
    certainty: options.certainty || 'Likely',
    start,
    end,
    sender: source,
    description: [
      {
        language: 'En',
        event: alertType.event,
        headline: `${alertType.event} issued for New York County until ${new Date(end * 1000).toLocaleString()}`,
        description: generateMockDescription(alertType.event, lat, lon),
        instruction: generateMockInstruction(alertType.event)
      }
    ]
  };
}

/**
 * Generate mock description for an alert
 * @param {string} eventType - The type of event
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} - Mock description
 */
function generateMockDescription(eventType, lat, lon) {
  const locationDesc = `at latitude ${lat.toFixed(4)} and longitude ${lon.toFixed(4)}`;
  
  if (eventType.includes('Tornado')) {
    return `...TORNADO WARNING REMAINS IN EFFECT UNTIL 7:30 PM EDT...\n\n* WHAT...Damaging tornado and ping pong ball size hail.\n* WHERE...${locationDesc} including the cities of Warrington, Bristol, and Bensalem.\n* WHEN...Until 7:30 PM EDT.\n* IMPACTS...Flying debris will be dangerous to those caught without shelter. Mobile homes will be damaged or destroyed. Damage to roofs, windows, and vehicles will occur. Tree damage is likely.`;
  }
  
  if (eventType.includes('Flood')) {
    return `...FLOOD WARNING REMAINS IN EFFECT UNTIL 930 PM EDT...\n\n* WHAT...Flooding caused by excessive rainfall continues.\n* WHERE...${locationDesc}, including the cities of San Antonio, and Universal City.\n* WHEN...Until 930 PM EDT.\n* IMPACTS...Flooding of rivers, creeks, streams, and other low-lying and flood-prone locations.`;
  }
  
  if (eventType.includes('Thunderstorm')) {
    return `...SEVERE THUNDERSTORM WARNING REMAINS IN EFFECT UNTIL 615 PM EDT...\n\n* WHAT...60 mph wind gusts and quarter size hail.\n* WHERE...${locationDesc}.\n* WHEN...Until 615 PM EDT.\n* IMPACTS...Hail damage to vehicles is expected. Expect wind damage to roofs, siding, and trees.`;
  }
  
  if (eventType.includes('Winter')) {
    return `...WINTER STORM WARNING REMAINS IN EFFECT UNTIL NOON EDT TOMORROW...\n\n* WHAT...Heavy snow expected. Total snow accumulations of 5 to 9 inches.\n* WHERE...${locationDesc}.\n* WHEN...Until noon EDT tomorrow.\n* IMPACTS...Travel could be very difficult. The hazardous conditions could impact the morning commute.`;
  }
  
  if (eventType.includes('Heat')) {
    return `...HEAT ADVISORY REMAINS IN EFFECT FROM 11 AM TO 8 PM EDT TOMORROW...\n\n* WHAT...Heat index values up to 102 expected.\n* WHERE...${locationDesc}.\n* WHEN...From 11 AM to 8 PM EDT tomorrow.\n* IMPACTS...Hot temperatures and high humidity may cause heat illnesses.`;
  }
  
  return `...${eventType.toUpperCase()} FOR THE AREA AROUND ${locationDesc}...\n\nA significant weather event is expected to affect this area. Please take necessary precautions.`;
}

/**
 * Generate mock instruction for an alert
 * @param {string} eventType - The type of event
 * @returns {string} - Mock instruction
 */
function generateMockInstruction(eventType) {
  if (eventType.includes('Tornado')) {
    return 'TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris.';
  }
  
  if (eventType.includes('Flood')) {
    return 'Turn around, don\'t drown when encountering flooded roads. Most flood deaths occur in vehicles. Be aware of your surroundings and do not drive on flooded roads.';
  }
  
  if (eventType.includes('Thunderstorm')) {
    return 'For your protection move to an interior room on the lowest floor of a building. Large hail and damaging winds and continuous cloud to ground lightning is occurring with this storm. Move indoors immediately.';
  }
  
  if (eventType.includes('Winter')) {
    return 'If you must travel, keep an extra flashlight, food, and water in your vehicle in case of an emergency. The latest road conditions can be obtained by calling 5-1-1.';
  }
  
  if (eventType.includes('Heat')) {
    return 'Drink plenty of fluids, stay in an air-conditioned room, stay out of the sun, and check up on relatives and neighbors. Young children and pets should never be left unattended in vehicles under any circumstances.';
  }
  
  return 'Take appropriate actions based on the severity of the situation. Monitor local news stations or weather services for updates.';
}

/**
 * Generate multiple mock alerts for testing
 * @param {number} count - Number of alerts to generate
 * @returns {Array} - Array of mock alerts
 */
function generateMockAlerts(count = 5) {
  const alerts = [];
  
  for (let i = 0; i < count; i++) {
    // Vary the location for each alert
    const lat = 40.7128 + (Math.random() - 0.5) * 10;
    const lon = -74.0060 + (Math.random() - 0.5) * 10;
    
    // Generate alert
    alerts.push(generateMockAlert({ latitude: lat, longitude: lon }));
  }
  
  return alerts;
}

module.exports = {
  generateMockAlert,
  generateMockAlerts,
  generateMockPolygon,
  generateMockMultiPolygon,
  alertTypes,
  alertSources
}; 