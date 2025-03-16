import SunCalc from 'suncalc';

/**
 * Calculates solar times (sunrise, sunset, etc.) for a given date and location
 * using the optimized SunCalc library
 * 
 * @param {Date} date - The date to calculate solar times for
 * @param {number} latitude - Latitude in decimal degrees
 * @param {number} longitude - Longitude in decimal degrees
 * @returns {Object} Object containing various solar time points
 */
export const getSolarTimes = (date, latitude, longitude) => {
  try {
    // Use SunCalc to get all sun positions for the given date and location
    const times = SunCalc.getTimes(date, latitude, longitude);
    
    // Calculate dawn as 30 minutes before sunrise (if needed)
    const dawn = new Date(times.sunrise.getTime() - 30 * 60 * 1000);
    
    // Calculate dusk as 30 minutes after sunset (if needed)
    const dusk = new Date(times.sunset.getTime() + 30 * 60 * 1000);
    
    return {
      // Standard sunrise and sunset
      sunrise: times.sunrise,
      sunset: times.sunset,
      
      // Extended times
      dawn: dawn,
      dusk: dusk,
      
      // Additional solar times provided by SunCalc
      solarNoon: times.solarNoon,
      nadir: times.nadir,
      sunriseEnd: times.sunriseEnd,
      sunsetStart: times.sunsetStart,
      civilDawn: times.dawn,
      civilDusk: times.dusk,
      nauticalDawn: times.nauticalDawn,
      nauticalDusk: times.nauticalDusk,
      astronomicalDawn: times.nightEnd,
      astronomicalDusk: times.night,
      goldenHourEnd: times.goldenHourEnd,
      goldenHourStart: times.goldenHour
    };
  } catch (error) {
    console.error('Error calculating solar times:', error);
    return getFallbackSolarTimes(date, latitude, longitude);
  }
};

/**
 * Fallback method in case SunCalc fails (rarely happens)
 * Uses simplified calculation
 */
const getFallbackSolarTimes = (date, latitude, longitude) => {
  try {
    // Simple fallback logic - approximate times based on latitude
    const fallbackDate = new Date(date);
    
    // Northern hemisphere summer / southern hemisphere winter
    const isNorthernSummer = fallbackDate.getMonth() >= 3 && fallbackDate.getMonth() <= 8;
    
    // Adjust sunrise/sunset times based on latitude and season
    let sunriseHour = 6; // Default sunrise at 6am
    let sunsetHour = 18; // Default sunset at 6pm
    
    // Adjust for latitude
    const absLatitude = Math.abs(latitude);
    if (absLatitude > 60) {
      // Polar regions
      if ((latitude > 0 && isNorthernSummer) || (latitude < 0 && !isNorthernSummer)) {
        // Polar day - very early sunrise, very late sunset
        sunriseHour = 3;
        sunsetHour = 21;
      } else {
        // Polar night - late sunrise, early sunset
        sunriseHour = 10;
        sunsetHour = 14;
      }
    } else if (absLatitude > 40) {
      // Higher latitudes - more seasonal variation
      if ((latitude > 0 && isNorthernSummer) || (latitude < 0 && !isNorthernSummer)) {
        sunriseHour = 5;
        sunsetHour = 20;
      } else {
        sunriseHour = 7;
        sunsetHour = 17;
      }
    } else if (absLatitude > 20) {
      // Mid latitudes - moderate seasonal variation
      if ((latitude > 0 && isNorthernSummer) || (latitude < 0 && !isNorthernSummer)) {
        sunriseHour = 5;
        sunsetHour = 19;
      } else {
        sunriseHour = 6;
        sunsetHour = 18;
      }
    } else {
      // Near equator - little seasonal variation
      sunriseHour = 6;
      sunsetHour = 18;
    }
    
    // Create date objects for the calculated times
    const sunrise = new Date(fallbackDate);
    sunrise.setHours(sunriseHour, 0, 0, 0);
    
    const sunset = new Date(fallbackDate);
    sunset.setHours(sunsetHour, 0, 0, 0);
    
    // Calculate dawn and dusk
    const dawn = new Date(sunrise.getTime() - 30 * 60 * 1000);
    const dusk = new Date(sunset.getTime() + 30 * 60 * 1000);
    
    return {
      sunrise,
      sunset,
      dawn,
      dusk,
      solarNoon: new Date(fallbackDate.setHours(12, 0, 0, 0))
    };
  } catch (error) {
    console.error('Error in fallback solar times calculation:', error);
    
    // Ultimate fallback with hardcoded times
    const fallbackDate = new Date(date);
    return {
      sunrise: new Date(fallbackDate.setHours(6, 0, 0, 0)),
      sunset: new Date(fallbackDate.setHours(18, 0, 0, 0)),
      dawn: new Date(fallbackDate.setHours(5, 30, 0, 0)),
      dusk: new Date(fallbackDate.setHours(18, 30, 0, 0)),
      solarNoon: new Date(fallbackDate.setHours(12, 0, 0, 0))
    };
  }
};

/**
 * Gets the appropriate lighting preset for a map based on time of day
 * 
 * @param {Date} date - Current date and time
 * @param {number} latitude - Latitude in decimal degrees
 * @param {number} longitude - Longitude in decimal degrees
 * @returns {string} A lighting preset name: 'dawn', 'day', 'dusk', or 'night'
 */
export const getLightingPreset = (date, latitude, longitude) => {
  if (!date) return 'day'; // Default to day if no date
  
  try {
    // Get solar times for the location
    const solarTimes = getSolarTimes(date, latitude, longitude);
    
    // Get the current time in minutes since midnight
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    
    // Convert solar times to minutes for comparison
    const sunriseMinutes = solarTimes.sunrise.getHours() * 60 + solarTimes.sunrise.getMinutes();
    const sunsetMinutes = solarTimes.sunset.getHours() * 60 + solarTimes.sunset.getMinutes();
    const dawnMinutes = solarTimes.dawn.getHours() * 60 + solarTimes.dawn.getMinutes();
    const duskMinutes = solarTimes.dusk.getHours() * 60 + solarTimes.dusk.getMinutes();
    
    // Special case: if we're in polar regions and sunrise is after sunset
    // (can happen with poor calculations or at extreme latitudes)
    if (sunsetMinutes < sunriseMinutes) {
      if (totalMinutes >= sunsetMinutes && totalMinutes <= 24*60) {
        return 'night';
      } else if (totalMinutes >= 0 && totalMinutes <= sunriseMinutes) {
        return 'night';
      } else if (totalMinutes >= dawnMinutes && totalMinutes < sunriseMinutes) {
        return 'dawn';
      } else if (totalMinutes > sunsetMinutes && totalMinutes <= duskMinutes) {
        return 'dusk';
      } else {
        return 'day';
      }
    }
    
    // Normal case: determine light preset based on time of day
    if (totalMinutes >= dawnMinutes && totalMinutes < sunriseMinutes) {
      return 'dawn';
    } else if (totalMinutes > sunsetMinutes && totalMinutes <= duskMinutes) {
      return 'dusk';
    } else if (totalMinutes >= sunriseMinutes && totalMinutes <= sunsetMinutes) {
      return 'day';
    } else {
      return 'night';
    }
  } catch (error) {
    console.error('Error calculating lighting preset:', error);
    
    // Simple fallback based on hour
    const hour = date.getHours();
    if (hour >= 6 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'dusk';
    return 'night';
  }
};

/**
 * Gets sun position for a specific date, time and location
 * Useful for advanced lighting effects and shadow calculations
 */
export const getSunPosition = (date, latitude, longitude) => {
  try {
    // Get sun position (azimuth and altitude) for the given date and location
    const position = SunCalc.getPosition(date, latitude, longitude);
    
    return {
      azimuth: position.azimuth, // Horizontal direction of the sun (in radians, measured clockwise from south)
      altitude: position.altitude, // Vertical angle of the sun (in radians, 0 = horizon, π/2 = zenith)
      
      // These properties are useful for 3D rendering:
      zenith: (Math.PI / 2) - position.altitude, // Angle from zenith (0 = directly overhead, π/2 = horizon)
      
      // Convert to percentages (0-100) for easier use in styling
      altitudePercent: (position.altitude / (Math.PI / 2)) * 100,
      
      // Is the sun above the horizon?
      isDay: position.altitude > 0
    };
  } catch (error) {
    console.error('Error calculating sun position:', error);
    
    // Return a fallback position (sun at 45 degrees in the sky)
    return {
      azimuth: Math.PI, // South
      altitude: Math.PI / 4, // 45 degrees above horizon
      zenith: Math.PI / 4, // 45 degrees from zenith
      altitudePercent: 50,
      isDay: true
    };
  }
};

/**
 * For testing and optimization comparison purposes 
 */
export const benchmarkSolarCalculations = (latitude, longitude) => {
  const startTime = performance.now();
  const date = new Date();
  
  // Run calculations 100 times
  for (let i = 0; i < 100; i++) {
    const newDate = new Date(date.getTime() + i * 86400000); // Add 1 day each time
    getSolarTimes(newDate, latitude, longitude);
  }
  
  const endTime = performance.now();
  return {
    executionTime: endTime - startTime,
    calculationsPerSecond: 100 / ((endTime - startTime) / 1000)
  };
};

export default {
  getSolarTimes,
  getLightingPreset,
  getSunPosition,
  benchmarkSolarCalculations
}; 