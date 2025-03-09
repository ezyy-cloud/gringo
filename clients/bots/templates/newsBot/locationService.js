/**
 * News Bot - Location Service
 * Handles extracting and geocoding locations from news items
 */
const { logger } = require('../../utils');
const { extractLocationNames, geocodeLocation } = require('../utilities/locationUtils');

/**
 * Get location coordinates for a news item
 * Extracts location names from news text and geocodes them
 *
 * @param {Object} newsItem - News item to analyze for locations
 * @returns {Object|null} - Location object with coordinates or null if not found
 */
async function getNewsLocation(newsItem) {
  try {
    logger.debug(`Extracting location for news item: "${newsItem.title}"`);
    
    // STRATEGY 1: Try to extract locations from text
    // Extract potential location names from the news text
    const locationNames = extractLocationNames(
      newsItem.title, 
      newsItem.description || newsItem.content || '',
      true // Enable debug mode to see extracted locations
    );
    
    if (locationNames.length > 0) {
      logger.debug(`Found ${locationNames.length} potential locations in news text`);
      
      // Try to geocode each location until one succeeds
      for (const locationName of locationNames) {
        const location = await geocodeLocation(locationName);
        if (location) {
          logger.debug(`Successfully geocoded location "${locationName}" for news item`);
          return location;
        }
      }
      
      logger.debug(`Could not geocode any of the extracted locations`);
    } else {
      logger.debug(`No locations found in news item text`);
    }
    
    // STRATEGY 2: Try to use the country information from the item
    // If no locations could be extracted or geocoded, try using the country
    const countryLocation = await tryExtractCountryLocation(newsItem);
    if (countryLocation) {
      return countryLocation;
    }
    
    // STRATEGY 3: Fallback to default locations based on source
    // If all else fails, try to infer location from the news source
    const sourceLocation = await trySourceBasedLocation(newsItem);
    if (sourceLocation) {
      return sourceLocation;
    }
    
    // SPECIAL CASES: For cyclone Alfred news
    if (newsItem.title.toLowerCase().includes('cyclone alfred')) {
      logger.debug(`Special case: Cyclone Alfred news, using Queensland, Australia`);
      const location = await geocodeLocation('Queensland, Australia');
      if (location) {
        return {
          ...location,
          fuzzyLocation: true
        };
      }
    }
    
    logger.debug(`Failed to find any location for news item`);
    return null;
  } catch (error) {
    logger.error(`Error getting location for news item: ${newsItem.title}`, error);
    return null;
  }
}

/**
 * Try to get location from the country if available
 * @param {Object} newsItem - News item
 * @returns {Object|null} - Location object or null
 */
async function tryExtractCountryLocation(newsItem) {
  // Check for structured country field (array or string)
  if (newsItem.country) {
    let countryNames = [];
    
    if (Array.isArray(newsItem.country)) {
      countryNames = newsItem.country;
    } else if (typeof newsItem.country === 'string') {
      countryNames = [newsItem.country];
    }
    
    // Try each country code/name
    for (const country of countryNames) {
      // Map common country codes to full names for better geocoding
      const countryMap = {
        'us': 'United States',
        'uk': 'United Kingdom', 
        'gb': 'United Kingdom',
        'au': 'Australia',
        'ca': 'Canada',
        'fr': 'France',
        'de': 'Germany',
        'jp': 'Japan',
        'it': 'Italy',
        'es': 'Spain',
        'br': 'Brazil',
        'in': 'India',
        'cn': 'China',
        'ru': 'Russia'
      };
      
      // Use mapped name if available, otherwise use original
      const countryName = countryMap[country.toLowerCase()] || country;
      
      logger.debug(`Trying to geocode country: ${countryName}`);
      
      const countryLocation = await geocodeLocation(countryName);
      if (countryLocation) {
        logger.debug(`Successfully geocoded country: ${countryName}`);
        return {
          ...countryLocation,
          fuzzyLocation: true
        };
      }
    }
  }
  
  return null;
}

/**
 * Try to infer location from the news source
 * @param {Object} newsItem - News item
 * @returns {Object|null} - Location object or null
 */
async function trySourceBasedLocation(newsItem) {
  if (!newsItem.source_id && !newsItem.source_name) {
    return null;
  }
  
  // Map news sources to likely locations
  const sourceLocationMap = {
    // AU sources
    'theage': 'Australia',
    'smh': 'Australia',
    'theaustralian': 'Australia',
    'abc.net.au': 'Australia',
    'watoday': 'Australia',
    'brisbanetimes': 'Australia',
    'canberratimes': 'Australia',
    'bunburymail': 'Australia',
    'bluemountainsgazette': 'Australia',
    
    // US sources
    'cnn': 'United States',
    'nytimes': 'United States',
    'washingtonpost': 'United States',
    'usatoday': 'United States',
    'foxnews': 'United States',
    'latimes': 'United States',
    
    // UK sources
    'bbc': 'United Kingdom',
    'theguardian': 'United Kingdom',
    'dailymail': 'United Kingdom',
    'telegraph': 'United Kingdom',
    'independent': 'United Kingdom',
    
    // Others
    'globeandmail': 'Canada',
    'lemonde': 'France',
    'thehindu': 'India',
    'straitstimes': 'Singapore',
    'aljazeera': 'Qatar'
  };
  
  const sourceId = (newsItem.source_id || '').toLowerCase();
  const sourceName = (newsItem.source_name || '').toLowerCase();
  
  // Try source ID first
  for (const [source, location] of Object.entries(sourceLocationMap)) {
    if (sourceId.includes(source) || sourceName.includes(source)) {
      logger.debug(`Inferring location from news source: ${location}`);
      const sourceLocation = await geocodeLocation(location);
      if (sourceLocation) {
        return {
          ...sourceLocation,
          fuzzyLocation: true
        };
      }
    }
  }
  
  return null;
}

module.exports = {
  getNewsLocation,
  geocodeLocation
}; 