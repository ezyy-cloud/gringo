const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests (Nominatim requires 1 req/sec)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Geocode a location string to coordinates
 * @param {string} locationString - The location to geocode
 * @returns {Promise<{lat: number, lon: number, display_name: string} | null>} - Geocoding result or null if not found
 */
async function geocodeLocation(locationString) {
  if (!locationString || typeof locationString !== 'string') {
    console.log(`Invalid location string: ${locationString}`);
    return null;
  }

  // Skip strings that are likely not actual locations
  const nonLocationTerms = [
    'forensic accounting', 'commercial damages', 'expert determiner', 
    'chief growth', 'operations officer', 'facd experts', 'master', 
    'accounting', 'economics', 'university', 'chartered accountant',
    'contact', 'she', 'her', 'international', 'prnewswire', 'hka', 'facd'
  ];
  
  if (nonLocationTerms.some(term => locationString.toLowerCase().includes(term.toLowerCase()))) {
    console.log(`Skipping likely non-location term: ${locationString}`);
    return null;
  }

  console.log(`Geocoding location: ${locationString}`);
  
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      // Add a delay to respect rate limits (only after first attempt)
      if (retries > 0) {
        await sleep(RETRY_DELAY_MS);
      }
      
      const response = await axios.get(NOMINATIM_BASE_URL, {
        params: {
          q: locationString,
          format: 'json',
          addressdetails: 1,
          limit: 1
        },
        headers: {
          'User-Agent': 'YourAppName/1.0', // Nominatim requires a User-Agent header
          'Accept-Language': 'en' // Prefer English results
        },
        timeout: 5000 // 5 second timeout
      });
      
      // Wait before next request to respect rate limits
      await sleep(RATE_LIMIT_DELAY_MS);
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        console.log(`Successfully geocoded "${locationString}" to ${result.lat}, ${result.lon}`);
        return {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          display_name: result.display_name
        };
      } else {
        console.log(`No results found for location: ${locationString}`);
        return null;
      }
    } catch (error) {
      retries++;
      const errorMessage = error.response 
        ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
        : error.message;
        
      console.error(`Error geocoding location ${locationString} (attempt ${retries}/${MAX_RETRIES}): ${errorMessage}`);
      
      // If we've reached max retries, give up
      if (retries > MAX_RETRIES) {
        console.error(`Max retries reached for ${locationString}, giving up.`);
        return null;
      }
    }
  }
  
  return null;
}

// Export the geocoding function
module.exports = {
  geocodeLocation
}; 