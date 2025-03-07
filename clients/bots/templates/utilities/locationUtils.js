/**
 * Location Utility Functions
 * 
 * A collection of reusable functions for extracting and processing
 * location information from text and geocoding locations.
 */

const NodeGeocoder = require('node-geocoder');

// Geocoder setup
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  // Optional depending on the providers
  apiKey: process.env.GEOCODER_API_KEY, // for Mapquest, OpenCage, Google Premier
  formatter: null // 'gpx', 'string', etc.
});

/**
 * Process a single regex pattern match
 * 
 * @param {RegExp} pattern - The pattern that was matched
 * @param {Array} match - The match result
 * @returns {string} - The location name extracted from the match
 */
const processLocationMatch = (pattern, match) => {
  const patternStr = pattern.toString();
  
  if (patternStr.includes('City, Country')) {
    return `${match[1]}, ${match[2]}`;
  } 
  
  if (match[2] && patternStr.includes('State abbreviations')) {
    return `${match[1]}, ${match[2]}`;
  } 
  
  // Add the full match if it's the standalone location pattern
  if (patternStr.includes('Standalone')) {
    return match[0];
  } 
  
  // Otherwise add the first capture group
  return match[1];
};


/**
 * Extract potential location names from text
 * 
 * @param {string} title - The title text to analyze
 * @param {string} description - The description text to analyze
 * @param {boolean} debug - Whether to output debug info
 * @returns {Array} - Array of potential location names
 */
const extractLocationNames = (title, description, debug = false) => {
  const combinedText = `${title} ${description}`;
  const locations = new Set();
  
  // Common location patterns
  const patterns = [
    // Locations after prepositions
    /\b(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?)/g,
    
    // City, Country patterns
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    
    // Common U.S. abbreviations (e.g., D.C., N.Y., L.A.)
    /\b([A-Z]\.[A-Z]\.)\b/g,
    
    // Standalone known locations (like D.C., Washington, New York)
    /\b(D\.C\.|Washington(?:\s+D\.C\.)?|New York|Los Angeles|Chicago|Houston|Miami|Boston|Seattle|London|Tokyo|Paris|Berlin)\b/g,
    
    // State abbreviations with context
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z]{2})\b/g
  ];
  
  // Apply each pattern
  patterns.forEach(pattern => {
    let match;
    pattern.lastIndex = 0; // Reset the regex index
    
    while ((match = pattern.exec(combinedText)) !== null) {
      const location = processLocationMatch(pattern, match);
      locations.add(location);
    }
  });
  
  if (debug && locations.size > 0) {
    console.log(`Extracted potential locations:`, Array.from(locations));
  }
  
  return Array.from(locations);
};

/**
 * Geocode a location name to coordinates
 * 
 * @param {string} locationName - Name of the location to geocode
 * @returns {Object|null} - Geocoded coordinates or null if not found
 */
const geocodeLocation = async (locationName) => {
  try {
    console.log(`Geocoding location: ${locationName}`);
    
    const results = await geocoder.geocode(locationName);
    
    if (results && results.length > 0) {
      const location = {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
        fuzzyLocation: true,
        locationName: locationName // Store the original location name
      };
      
      console.log(`Successfully geocoded ${locationName} to coordinates:`, {
        lat: location.latitude,
        lng: location.longitude
      });
      
      return location;
    }
    
    console.log(`Could not geocode location: ${locationName}`);
    return null;
  } catch (error) {
    console.log(`Error geocoding location ${locationName}:`, error.message);
    return null;
  }
};

module.exports = {
  extractLocationNames,
  geocodeLocation,
  processLocationMatch,
}; 