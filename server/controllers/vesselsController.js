const WebSocket = require('ws');
const axios = require('axios');
const { validateApiKey } = require('../utils/validation');

// Get API key from environment variables or use a default for development
// In production, this should ONLY come from environment variables
const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY || 'your_development_api_key_here';

// In-memory store for vessel data
const vesselsStore = {
  vessels: new Map(), // Store vessel data by MMSI
  lastUpdated: Date.now()
};

// Global variables for connection management
let reconnectAttempts = 0;
let reconnectTimeoutId = null;
let isReconnecting = false;
let lastApiKey = AISSTREAM_API_KEY; // Use the stored API key by default

// Connect to AISStream WebSocket with exponential backoff
const connectToAISStream = (apiKey = AISSTREAM_API_KEY) => {
  // Store API key for reconnection
  lastApiKey = apiKey;
  
  // If already reconnecting, don't start another attempt
  if (isReconnecting) {
    console.log('Already attempting to reconnect to AISStream WebSocket');
    return;
  }
  
  // Close any existing connection
  if (global.aisStreamWs) {
    try {
      // Only close if it's not already closing or closed
      if (global.aisStreamWs.readyState === WebSocket.OPEN || 
          global.aisStreamWs.readyState === WebSocket.CONNECTING) {
        global.aisStreamWs.terminate(); // Force close
      }
    } catch (err) {
      console.error('Error closing existing WebSocket:', err);
    }
    global.aisStreamWs = null;
  }
  
  // Clear any pending reconnect timeout
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  
  isReconnecting = true;
  
  try {
    console.log('Connecting to AISStream WebSocket...');
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    
    // Set a connection timeout
    const connectionTimeoutId = setTimeout(() => {
      console.log('WebSocket connection timeout after 15 seconds');
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    }, 15000);
    
    ws.on('open', () => {
      console.log('Connected to AISStream WebSocket');
      clearTimeout(connectionTimeoutId);
      
      // Reset reconnection attempts on successful connection
      reconnectAttempts = 0;
      isReconnecting = false;
      
      // Subscribe to vessel position reports using the exact format from AISStream.io JavaScript example
      const subscriptionMessage = {
        apiKey: apiKey,
        boundingBoxes: [[[-90.0, -180.0], [90.0, 180.0]]],
        filterMessageTypes: ["PositionReport"] 
      };
      
      console.log('Sending subscription message with masked API key: ' + maskApiKey(apiKey));
      
      try {
        ws.send(JSON.stringify(subscriptionMessage));
        console.log('Subscription message sent successfully');
      } catch (err) {
        console.error('Error sending subscription message:', err);
      }
    });
    
    ws.on('message', (data) => {
      try {
        
        const aisMessage = JSON.parse(data);
        
        // Check for authentication errors or malformed subscription errors
        if (aisMessage.error || aisMessage.ERROR) {
          const errorMessage = aisMessage.error || aisMessage.ERROR || 'Unknown error';
          
          // If it's an authentication error, don't retry with the same API key
          if (errorMessage.includes('authentication') || 
              errorMessage.includes('API key') || 
              errorMessage.includes('Unauthorized') ||
              errorMessage.includes('invalid')) {
            lastApiKey = null; // Clear API key to prevent further reconnection attempts
            ws.close(1000, 'Authentication failed');
            return;
          }
          
          return;
        }
        
        // Process position reports according to current AISStream.io response format
        if (aisMessage && aisMessage.Message && aisMessage.Message.PositionReport) {
          const positionReport = aisMessage.Message.PositionReport;
          const metaData = aisMessage.MetaData || {};
          
          // Extract MMSI from the correct location in the message
          const mmsi = positionReport.MMSI || positionReport.UserID || metaData.MMSI || 'unknown';
          
          try {
            // Extract vessel name from MetaData.ShipName or other locations
            const shipName = 
              (metaData && metaData.ShipName) || 
              positionReport.ShipName || 
              'Unknown';
              
            // Extract ship type from MetaData or position report
            const shipType = 
              (metaData && metaData.ShipType) || 
              positionReport.ShipType || 
              'Unknown';
            
            // Update vessel in store with data from the position report and preserving the original message structure
            const vesselData = {
              mmsi,
              latitude: positionReport.Latitude,
              longitude: positionReport.Longitude,
              cog: positionReport.Cog || 0, // Course Over Ground
              sog: positionReport.Sog || 0, // Speed Over Ground
              heading: positionReport.TrueHeading || 0,
              timestamp: new Date().toISOString(),
              // Include original data structure for client-side processing
              Message: aisMessage.Message,
              MetaData: {
                ...metaData,
                ShipName: shipName,
                MMSI: mmsi,
                ShipType: shipType,
                time_utc: new Date().toISOString()
              },
              // Also include common fields at top level for backward compatibility
              shipname: shipName,
              shiptype: shipType,
              callsign: (metaData && metaData.CallSign) || positionReport.CallSign || 'Unknown',
              lastUpdate: Date.now()
            };
            
            vesselsStore.vessels.set(mmsi, vesselData);
            vesselsStore.lastUpdated = Date.now();
      
          } catch (err) {
            console.error('Error processing vessel data:', err);
          }
        } 
      } catch (error) {
        console.error('Error processing AIS message:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`Disconnected from AISStream WebSocket. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      clearTimeout(connectionTimeoutId);
      
      // Reconnect with exponential backoff
      if (lastApiKey) {
        // Calculate delay with exponential backoff (max 5 minutes)
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 300000);
        
        console.log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
        
        isReconnecting = false; // Reset for next attempt
        reconnectTimeoutId = setTimeout(() => {
          reconnectTimeoutId = null;
          connectToAISStream(lastApiKey);
        }, delay);
      }
    });
    
    ws.on('error', (error) => {
      console.error('AISStream WebSocket error:', error);
      clearTimeout(connectionTimeoutId);
      
      // Let the close handler handle reconnection
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    });
    
    // Store WebSocket connection globally for later access
    global.aisStreamWs = ws;
    
    return ws;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    isReconnecting = false;
    
    // Attempt to reconnect after a delay
    if (lastApiKey) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 300000);
      
      console.log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts})`);
      
      reconnectTimeoutId = setTimeout(() => {
        reconnectTimeoutId = null;
        connectToAISStream(lastApiKey);
      }, delay);
    }
  }
};

// Controller methods
exports.initializeVesselTracking = async (req, res) => {
  try {
    // Use the server-side API key 
    const apiKey = AISSTREAM_API_KEY;
    
    // Check if API key is configured
    if (!apiKey || apiKey === 'your_development_api_key_here' || apiKey === 'your_actual_aisstream_api_key_here') {
      console.error('AISStream API key not properly configured in server environment');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error: API key not properly configured' 
      });
    }
    
    // Validate API key format
    if (!validateApiKey(apiKey)) {
      console.error('Invalid AISStream API key format in server configuration');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error: Invalid API key format' 
      });
    }
    
    // Check WebSocket connection status
    const wsStatus = global.aisStreamWs ? global.aisStreamWs.readyState : null;
    
    // Only initialize if not already connected
    if (wsStatus !== WebSocket.OPEN) {
      // Reset reconnection attempts when initializing
      reconnectAttempts = 0;
      
      // Initialize WebSocket connection
      connectToAISStream(apiKey);
      
      console.log('Initializing new vessel tracking connection');
    } else {
      console.log('Vessel tracking already initialized and connected');
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Vessel tracking initialized with server API key',
      connectionStatus: global.aisStreamWs ? global.aisStreamWs.readyState : 'not_initialized'
    });
  } catch (error) {
    console.error('Error initializing vessel tracking:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error initializing vessel tracking' 
    });
  }
};

exports.getVessels = async (req, res) => {
  try {
    // Convert Map to array of vessel objects
    const vessels = Array.from(vesselsStore.vessels.values());
    
    // Return only vessels updated in the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentVessels = vessels.filter(v => v.lastUpdate > oneHourAgo);
    
    // If we have no vessels but have an API key, attempt reconnection
    if (recentVessels.length === 0 && lastApiKey && 
        (!global.aisStreamWs || global.aisStreamWs.readyState !== WebSocket.OPEN)) {
      console.log('No recent vessels and WebSocket not connected. Attempting reconnection...');
      connectToAISStream(lastApiKey);
    }
    
    return res.status(200).json({
      success: true,
      count: recentVessels.length,
      lastUpdated: vesselsStore.lastUpdated,
      vessels: recentVessels,
      connectionStatus: global.aisStreamWs ? global.aisStreamWs.readyState : 'not_initialized'
    });
  } catch (error) {
    console.error('Error fetching vessels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vessel data'
    });
  }
};

// Clean up old vessel data periodically
const cleanupInterval = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  try {
    const oneHourAgo = Date.now() - cleanupInterval;
    
    // Remove vessels not updated in the last hour
    for (const [mmsi, vessel] of vesselsStore.vessels.entries()) {
      if (vessel.lastUpdate < oneHourAgo) {
        vesselsStore.vessels.delete(mmsi);
      }
    }
    
    
    // Check WebSocket connection status and reconnect if needed
    if (lastApiKey && (!global.aisStreamWs || global.aisStreamWs.readyState !== WebSocket.OPEN)) {
      connectToAISStream(lastApiKey);
    }
  } catch (error) {
    console.error('Error during vessel cleanup:', error);
  }
}, cleanupInterval);

// Helper function to mask API key for logs
function maskApiKey(apiKey) {
  if (!apiKey) return 'undefined';
  if (apiKey.length <= 8) return '****';
  
  // Only show the last 4 characters
  return '****' + apiKey.substr(apiKey.length - 4);
}

module.exports = exports; 