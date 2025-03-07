// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    // Get the Redis client from the request (set in server.js)
    const redisClient = req.app.get('redisClient');
    
    // Skip caching if Redis is not connected
    if (!redisClient || !redisClient.isReady) {
      console.log('Redis not ready, skipping cache');
      return next();
    }
    
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create a unique key based on the request URL and query parameters
    const key = `cache:${req.originalUrl}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await redisClient.get(key);
      
      if (cachedResponse) {
        // If found, send the cached response
        const parsedResponse = JSON.parse(cachedResponse);
        return res.status(200).json(parsedResponse);
      }
      
      // If not found, replace res.json to intercept the response
      const originalJson = res.json;
      res.json = function(body) {
        // Restore the original res.json method
        res.json = originalJson;
        
        // Only cache successful responses
        if (res.statusCode === 200) {
          // Store in cache with expiration (TTL in seconds)
          redisClient.set(key, JSON.stringify(body), {
            EX: duration
          }).catch(err => {
            console.error('Redis cache set error:', err);
          });
        }
        
        // Continue with the original response
        return res.json(body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

// Helper to invalidate cache
const invalidateCache = async (redisClient, patterns) => {
  // Skip if Redis is not connected
  if (!redisClient || !redisClient.isReady) {
    console.log('Redis not ready, skipping cache invalidation');
    return;
  }
  
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }
  
  try {
    for (const pattern of patterns) {
      try {
        // Use SCAN to find keys matching the pattern
        let cursor = 0;
        do {
          const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
          cursor = result.cursor;
          
          // Delete all found keys
          if (result.keys.length > 0) {
            await redisClient.del(result.keys);
            console.log(`Invalidated ${result.keys.length} cache keys matching: ${pattern}`);
          }
        } while (cursor !== 0);
      } catch (patternError) {
        console.error(`Error scanning for pattern ${pattern}:`, patternError);
        // Continue with next pattern
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
    // Just log the error and continue - don't let cache issues break the app
  }
};

module.exports = {
  cache,
  invalidateCache
}; 