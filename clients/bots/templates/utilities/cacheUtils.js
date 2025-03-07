/**
 * Cache Utility Functions
 * 
 * A collection of reusable functions for managing data caches,
 * especially for APIs with rate limits or to prevent duplicate processing.
 */

/**
 * Create a new cache object with basic operations
 * 
 * @param {Object} options - Cache configuration options
 * @returns {Object} - Cache object with methods
 */
const createCache = (options = {}) => {
  const {
    maxSize = 50,
    name = 'DataCache',
    ttl = 3600000 // Default TTL: 1 hour in ms
  } = options;
  
  // Initialize cache
  const cache = {
    lastUpdated: null,
    items: [],
    name,
    maxSize,
    ttl
  };
  
  return {
    /**
     * Add an item to the cache
     * 
     * @param {Object} item - Item to add to cache
     * @param {string} idProperty - Property to use as unique identifier
     * @returns {boolean} - Whether item was added (true) or already existed (false)
     */
    add: (item, idProperty = 'id') => {
      if (!item || typeof item !== 'object' || !item[idProperty]) {
        console.log(`Cannot add item to ${name} cache: Missing required ${idProperty} property`);
        return false;
      }
      
      // Check if item already exists in cache
      const exists = cache.items.some(
        cachedItem => cachedItem[idProperty] === item[idProperty]
      );
      
      if (exists) {
        return false;
      }
      
      // Add to cache
      cache.items.push(item);
      cache.lastUpdated = new Date();
      
      // Trim cache if needed
      if (cache.items.length > maxSize) {
        cache.items = cache.items.slice(-maxSize); // Keep only most recent items
      }
      
      return true;
    },
    
    /**
     * Check if an item exists in the cache
     * 
     * @param {string|Object} idOrItem - ID string or item object
     * @param {string} idProperty - Property to use as unique identifier
     * @returns {boolean} - Whether item exists in cache
     */
    exists: (idOrItem, idProperty = 'id') => {
      const id = typeof idOrItem === 'object' ? idOrItem[idProperty] : idOrItem;
      
      if (!id) {
        return false;
      }
      
      return cache.items.some(item => item[idProperty] === id);
    },
    
    /**
     * Get all items in the cache
     * 
     * @returns {Array} - All items in cache
     */
    getAll: () => {
      return [...cache.items];
    },
    
    /**
     * Clear the cache
     */
    clear: () => {
      cache.items = [];
      cache.lastUpdated = new Date();
    },
    
    /**
     * Get the number of items in the cache
     * 
     * @returns {number} - Number of items in cache
     */
    size: () => {
      return cache.items.length;
    },
    
    /**
     * Check if cache is expired based on TTL
     * 
     * @returns {boolean} - Whether cache is expired
     */
    isExpired: () => {
      if (!cache.lastUpdated) {
        return true;
      }
      
      const now = new Date();
      return (now - cache.lastUpdated) > ttl;
    }
  };
};

module.exports = {
  createCache
}; 