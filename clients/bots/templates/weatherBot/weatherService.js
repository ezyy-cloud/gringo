/**
 * Weather Service
 * Handles fetching and formatting weather data
 */
const { logger } = require('../../utils');
const axios = require('axios');
const { extractLocationNames, geocodeLocation } = require('../utilities/locationUtils');

// Weather API key and configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo_key';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Get weather information for a location
 * @param {string} locationQuery - Location query in natural language
 * @returns {Object} - Weather information
 */
async function getWeatherForLocation(locationQuery) {
  try {
    logger.debug(`Getting weather for location: ${locationQuery}`);
    
    // Extract location name from the query
    const locationNames = extractLocationNames(locationQuery, '', true);
    
    if (locationNames.length === 0) {
      return {
        success: false,
        error: 'Could not identify a location in your query',
        mockWeather: getMockWeather()
      };
    }
    
    // Get the first location and geocode it
    const locationName = locationNames[0];
    const location = await geocodeLocation(locationName);
    
    if (!location) {
      return {
        success: false,
        error: `Could not find coordinates for "${locationName}"`,
        mockWeather: getMockWeather()
      };
    }
    
    // In a real implementation, this would call a weather API
    // For demonstration, return mock data
    return {
      success: true,
      location: locationName,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      weather: getMockWeather()
    };
  } catch (error) {
    logger.error('Error getting weather:', error);
    return {
      success: false,
      error: 'Error getting weather information',
      mockWeather: getMockWeather()
    };
  }
}

/**
 * Get mock weather data for demonstration
 * @returns {Object} - Mock weather data
 */
function getMockWeather() {
  const conditions = ['sunny', 'partly cloudy', 'cloudy', 'rainy', 'stormy', 'snowy', 'windy'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const temperature = Math.floor(Math.random() * 35) + 50; // 50-85°F
  
  return {
    condition: randomCondition,
    temperature: temperature,
    humidity: Math.floor(Math.random() * 60) + 40, // 40-100%
    wind: Math.floor(Math.random() * 15) + 5, // 5-20 mph
    forecast: 'Similar conditions expected for the next few days.'
  };
}

module.exports = {
  getWeatherForLocation
}; 