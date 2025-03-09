# Bot Utilities

Shared utility functions used by multiple bot templates.

## Files

- `apiUtils.js` - Utilities for API requests, retries, and response formatting
- `cacheUtils.js` - Utilities for data caching to improve performance
- `locationUtils.js` - Utilities for extracting and geocoding locations from text
- `index.js` - Exports all utility modules

## API Utilities

The `apiUtils.js` module provides:

- `makeRequest()` - Make API requests with retry capability
- `validateImageUrl()` - Validate and fix image URLs
- `processApiResults()` - Transform API responses into standard format
- `downloadWithRetry()` - Download data with automatic retries
- `formatContentWithUrl()` - Format content with URLs within character limits

## Cache Utilities

The `cacheUtils.js` module provides:

- `createCache()` - Create a cache object with methods for:
  - `add()` - Add an item to the cache
  - `exists()` - Check if an item exists in the cache
  - `getAll()` - Get all items in the cache
  - `clear()` - Clear the cache
  - `size()` - Get the number of items in the cache
  - `isExpired()` - Check if the cache is expired

## Location Utilities

The `locationUtils.js` module provides:

- `extractLocationNames()` - Extract potential location names from text using Compromise.js
- `geocodeLocation()` - Geocode location names to coordinates using OpenStreetMap

## Usage Example

```javascript
const { extractLocationNames, geocodeLocation } = require('./utilities/locationUtils');
const apiUtils = require('./utilities/apiUtils');
const cacheUtils = require('./utilities/cacheUtils');

// Extract locations from text
const locations = extractLocationNames("What's the weather like in Paris?", "");

// Create a cache
const newsCache = cacheUtils.createCache({
  name: 'NewsCache',
  maxSize: 100,
  ttl: 10 * 60 * 1000 // 10 minutes
});

// Make an API request
const response = await apiUtils.makeRequest({
  url: 'https://api.example.com/data',
  method: 'GET',
  params: { id: 123 },
  maxRetries: 3
});
``` 