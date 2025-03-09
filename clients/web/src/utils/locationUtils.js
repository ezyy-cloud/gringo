/**
 * Create a fallback location based on existing messages
 * @param {Array} messagesArray - Array of messages
 * @returns {Object} Fallback location
 */
export const createFallbackLocation = (messagesArray = []) => {
  console.log('Creating fallback location from messages array');
  
  // Try to find a location from existing messages
  const messagesWithLocation = messagesArray.filter(msg => 
    msg.location && msg.location.latitude && msg.location.longitude
  );
  
  if (messagesWithLocation.length > 0) {
    console.log('Found location in existing messages');
    // Use the most recent message with location
    const recentMessage = messagesWithLocation[messagesWithLocation.length - 1];
    
    return {
      latitude: recentMessage.location.latitude,
      longitude: recentMessage.location.longitude,
      fuzzyLocation: true // Use fuzzyLocation property for MongoDB compatibility
    };
  }
  
  // If no message locations found, use default location (NYC)
  console.log('No message locations found, using default location');
  return {
    latitude: 40.7128,
    longitude: -74.0060,
    fuzzyLocation: true
  };
};

/**
 * Create a slightly varied location (within ~500m)
 * @param {Object} baseLocation - Base location
 * @returns {Object} Varied location
 */
export const createVariedLocation = (baseLocation) => {
  if (!baseLocation) return null;
  
  // Add a small random offset (within 100-200m) to prevent stacking markers
  const latVariation = (Math.random() - 0.5) * 0.003;
  const lngVariation = (Math.random() - 0.5) * 0.003;
  
  return {
    latitude: baseLocation.latitude + latVariation,
    longitude: baseLocation.longitude + lngVariation,
    fuzzyLocation: true // Standard property name for consistency
  };
};

/**
 * Create fuzzy location based on privacy settings
 * @param {Object} baseLocation - Base location
 * @param {boolean} useFuzzyLocation - Whether to use fuzzy location
 * @returns {Object} Fuzzy location
 */
export const createFuzzyLocation = (baseLocation, useFuzzyLocation = true) => {
  if (!baseLocation) return null;
  
  // If fuzzy location is not requested, return the exact location
  if (!useFuzzyLocation) {
    return {
      latitude: baseLocation.latitude,
      longitude: baseLocation.longitude,
      fuzzyLocation: false // Standard property name for consistency
    };
  }
  
  // For privacy, add a random offset (between 100m-500m)
  // More random offset than standard varied location
  const latVariation = (Math.random() - 0.5) * 0.01; // Roughly 0.5-1km variation
  const lngVariation = (Math.random() - 0.5) * 0.01;
  
  return {
    latitude: baseLocation.latitude + latVariation,
    longitude: baseLocation.longitude + lngVariation,
    fuzzyLocation: true // Standard property name for consistency
  };
};

/**
 * Handle geolocation success
 * @param {Object} position - Geolocation position
 * @param {Function} setLocationFunction - Function to set location
 */
export const handleGeolocationSuccess = (position, setLocationFunction) => {
  try {
    // Extract coordinates from the Geolocation API response
    const { latitude, longitude } = position.coords;
    
    // Check for valid coordinates
    if (!isNaN(latitude) && !isNaN(longitude)) {
      const locationData = {
        latitude,
        longitude,
        fuzzyLocation: false, // This is a real location, not a fuzzy one
        error: false,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      
      console.log("Successfully got geolocation:", locationData);
      setLocationFunction(locationData);
    } else {
      console.error("Invalid coordinates in geolocation result:", position);
      setLocationFunction(prevLocation => handleLocationFallback(prevLocation));
    }
  } catch (error) {
    console.error("Error processing geolocation result:", error);
    setLocationFunction(prevLocation => handleLocationFallback(prevLocation));
  }
};

/**
 * Handle location fallback
 * @param {Object} prevLocation - Previous location
 * @returns {Object} Fallback location
 */
export const handleLocationFallback = (prevLocation) => {
  console.log('Handling location fallback');
  // If we previously had a valid location, return that
  if (prevLocation && !prevLocation.error) {
    console.log('Using previous valid location');
    return prevLocation;
  }
  
  // Otherwise return a default location (NYC)
  console.log('No previous valid location, using default');
  return {
    latitude: 40.7128,
    longitude: -74.0060,
    fuzzyLocation: true,
    error: false
  };
};

/**
 * Filter old messages
 * @param {Array} messages - Messages array
 * @param {Date} timeThreshold - Time threshold
 * @returns {Array} Filtered messages
 */
export const filterOldMessages = (messages, timeThreshold) => {
  const newMessages = messages.filter(msg => {
    const msgDate = new Date(msg.timestamp);
    return msgDate >= timeThreshold;
  });
  
  // Log if any messages were removed
  const removedCount = messages.length - newMessages.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} old messages`);
  }
  
  return newMessages;
};

/**
 * Check if device is iOS
 * @returns {boolean} Is iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}; 