/**
 * Weather Bot - Geographic Utilities
 * Handles geographic operations for alert areas
 */
const { logger } = require('../../utils');
// Use mock database for testing
// const alertsDatabase = require('./alertsDatabase');
const alertsDatabase = require('./mockDatabase');

/**
 * Check if a point is inside a polygon
 * @param {Array} point - [longitude, latitude]
 * @param {Array} polygon - Array of [longitude, latitude] points
 * @returns {boolean} - True if point is inside polygon
 */
function pointInPolygon(point, polygon) {
  if (!point || !polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  
  const x = point[0];
  const y = point[1];
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if a point is inside any polygon in a multipolygon
 * @param {Array} point - [longitude, latitude]
 * @param {Array} multiPolygon - Array of polygons
 * @returns {boolean} - True if point is inside any polygon
 */
function pointInMultiPolygon(point, multiPolygon) {
  if (!point || !multiPolygon || !Array.isArray(multiPolygon)) {
    return false;
  }
  
  // In GeoJSON, a MultiPolygon is an array of polygons, and each polygon is an array of rings
  // The first ring is the exterior ring, the rest are holes
  for (const polygon of multiPolygon) {
    if (Array.isArray(polygon) && polygon.length > 0) {
      // Check against the exterior ring only (ignore holes for simplicity)
      const exteriorRing = polygon[0];
      if (pointInPolygon(point, exteriorRing)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a point is inside a GeoJSON geometry
 * @param {Object} point - {longitude, latitude}
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {boolean} - True if point is inside geometry
 */
function pointInGeometry(point, geometry) {
  if (!point || !geometry || !geometry.type || !geometry.coordinates) {
    return false;
  }
  
  // Convert point to [longitude, latitude] format
  const pointCoords = [point.longitude, point.latitude];
  
  if (geometry.type === 'Polygon') {
    // For a Polygon, the first array of coordinates is the exterior ring
    return pointInPolygon(pointCoords, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    return pointInMultiPolygon(pointCoords, geometry.coordinates);
  }
  
  return false;
}

/**
 * Find users whose locations are within a given geometry
 * @param {Object} geometry - GeoJSON geometry object from an alert
 * @returns {Promise<Array>} - Array of users within the geometry
 */
async function findUsersInGeometry(geometry) {
  try {
    // Get all user locations from the database
    const userLocations = await alertsDatabase.getAllUserLocations();
    
    if (!userLocations || userLocations.length === 0) {
      console.log('No user locations found for checking against alert geometry');
      return [];
    }
    
    // Find users within the geometry
    const usersInArea = userLocations.filter(user => {
      try {
        if (!user.location || !user.location.latitude || !user.location.longitude) {
          return false;
        }
        
        return pointInGeometry(user.location, geometry);
      } catch (error) {
        console.error(`Error checking if user ${user.userId} is in alert area: ${error.message}`);
        return false;
      }
    });
    
    console.log(`Found ${usersInArea.length} users within alert geometry out of ${userLocations.length} total users`);
    return usersInArea;
  } catch (error) {
    console.error(`Error finding users in geometry: ${error.message}`);
    return [];
  }
}

/**
 * Calculate the distance between two points in kilometers
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(point1.latitude)) * Math.cos(toRad(point2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Value in degrees
 * @returns {number} - Value in radians
 */
function toRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Check if a point is within a certain distance of a geometry
 * @param {Object} point - {latitude, longitude}
 * @param {Object} geometry - GeoJSON geometry
 * @param {number} distance - Distance in kilometers
 * @returns {boolean} - True if point is within distance
 */
function pointNearGeometry(point, geometry, distance = 50) {
  // Simple implementation: check if point is within a certain distance of any vertex in the geometry
  if (!point || !geometry || !geometry.coordinates) {
    return false;
  }
  
  // Extract all points from the geometry
  let allPoints = [];
  
  if (geometry.type === 'Polygon') {
    // Flatten polygon to array of points
    geometry.coordinates[0].forEach(coord => {
      allPoints.push({ longitude: coord[0], latitude: coord[1] });
    });
  } else if (geometry.type === 'MultiPolygon') {
    // Flatten multipolygon to array of points
    geometry.coordinates.forEach(polygon => {
      polygon[0].forEach(coord => {
        allPoints.push({ longitude: coord[0], latitude: coord[1] });
      });
    });
  }
  
  // Check if any point in the geometry is within the distance
  for (const geomPoint of allPoints) {
    if (calculateDistance(point, geomPoint) <= distance) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  findUsersInGeometry,
  pointInGeometry,
  calculateDistance,
  pointNearGeometry
}; 