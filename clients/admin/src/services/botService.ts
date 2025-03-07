import axios, { AxiosError } from 'axios';

const BOT_SERVICE_URL = import.meta.env.VITE_BOT_SERVICE_URL || 'http://localhost:3100/api';

// Flag to track if bot service is available or if we should use fallback
// Time when rate limit will reset (if applicable)
let rateLimitResetTime = 0;

// Cache for bot types to avoid repeated API calls
let cachedBotTypes: { data: any; success: boolean; } | null = null;
let botTypesCacheTime = 0;
const BOT_TYPES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Error logging helper
const logBotServiceError = (error: any, operation: string) => {
  // Extract useful information from error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Check for rate limiting
    if (axiosError.response?.status === 429) {
      const resetHeader = axiosError.response.headers['retry-after'] || 
                          axiosError.response.headers['x-ratelimit-reset'];
      
      // Parse the reset time if available
      if (resetHeader) {
        try {
          // If it's a relative time in seconds
          if (!isNaN(Number(resetHeader))) {
            rateLimitResetTime = Date.now() + (Number(resetHeader) * 1000);
          } 
          // If it's an absolute timestamp
          else {
            rateLimitResetTime = new Date(resetHeader).getTime();
          }
        } catch (e) {
          // If parsing fails, set a default (30 seconds)
          rateLimitResetTime = Date.now() + 30000;
        }
      } else {
        // Default to 30 seconds if no header
        rateLimitResetTime = Date.now() + 30000;
      }
      
      console.warn(`Bot Service rate limited during ${operation}. Reset at ${new Date(rateLimitResetTime).toLocaleTimeString()}`);
    } else {
      console.error(`Bot Service API Error:`, axiosError);
    }
  } else {
    console.error(`Bot Service Error (${operation}):`, error);
  }
};

// Helper to check if currently rate limited
const isRateLimited = () => {
  return Date.now() < rateLimitResetTime;
};

// Axios instance for bot service with interceptors
const botServiceAxios = axios.create({
  baseURL: BOT_SERVICE_URL,
  timeout: 10000,
});

// Add response interceptor to handle common errors
botServiceAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      // This will be logged by the calling function
    }
    // If bot service is down, mark it as unavailable
    else if (!error.response || error.response.status >= 500)
    
    return Promise.reject(error);
  }
);

// Get health status of bot service
export const getBotServiceHealth = async () => {
  // If recently rate limited, avoid making the request
  if (isRateLimited()) {
    const remainingSecs = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
    return { status: 'rate_limited', message: `Rate limited. Try again in ${remainingSecs} seconds.` };
  }
  
  try {
    const response = await botServiceAxios.get('/health');
    return response.data;
  } catch (error) {
    logBotServiceError(error, 'health check');
    
    // For health endpoint, we don't fall back to main server
    // Instead return status based on error
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 429) {
        return { status: 'rate_limited', message: 'Rate limited by bot service. Please try again later.' };
      }
      return { status: 'error', message: `Error ${error.response.status}: ${error.response.statusText}` };
    }
    
    return { status: 'error', message: 'Bot service is not responding' };
  }
};

// Test connection to bot microservice
export const testBotConnection = async () => {
  // If recently rate limited, avoid making the request
  if (isRateLimited()) {
    const remainingSecs = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
    return { 
      success: false, 
      status: 'rate_limited', 
      message: `Rate limited. Try again in ${remainingSecs} seconds.`
    };
  }
  
  try {
    // First try the /health endpoint which seems to work based on logs
    const response = await botServiceAxios.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    logBotServiceError(error, 'connection test');
    
    // Don't fall back to main server since it doesn't have bot routes
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 429) {
        return { 
          success: false, 
          status: 'rate_limited', 
          message: 'Rate limited by bot service. Please try again later.',
          error: 'Too many requests'
        };
      }
      return { 
        success: false, 
        status: 'error', 
        message: `Bot service returned error: ${error.response.status} ${error.response.statusText}`,
        error: error.message
      };
    }
    
    return { 
      success: false, 
      status: 'error', 
      message: 'Bot service is not responding',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Create axios instance for direct communication with the bot microservice
const botApi = axios.create({
  baseURL: import.meta.env.VITE_BOT_SERVICE_URL || 'http://localhost:3100',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to include the auth token in all requests
botApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add the bot API key for service-to-service communication
    config.headers['x-api-key'] = import.meta.env.VITE_BOT_API_KEY || 'dev-bot-api-key';
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
botApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // For development, log errors but don't break the app
    console.error('Bot Service API Error:', error);
    
    // Add more detailed error information
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Bot microservice connection failed: Service may be down or unreachable');
      error.isBotServiceDown = true;
    }
    
    // Preserve the full error structure for better handling upstream
    return Promise.reject(error);
  }
);

// Bot Monitoring and Control
export const getActiveBots = () => 
  botApi.get('/api/bots')
    .then(response => {
      // Handle response without logging
      return response.data;
    })
    .catch(error => {
      console.error('Error fetching active bots:', error);
      // No fallback to main server - return empty array
      return { status: 'error', message: 'Could not fetch active bots', bots: [] };
    });

export const getBotStatus = (botId: string) => 
  botApi.get(`/api/bots/${botId}/status`)
    .then(response => {
      // If we got a properly formatted status response with status object
      if (response.data && response.data.status) {
        return response.data.status;
      } 
      // If we got a success: true but no status object
      else if (response.data && response.data.success) {
        // API returns success but no status object
        return {
          id: botId,
          status: 'unknown',
          uptime: 0,
          memory: 0,
          cpu: 0,
          lastMessage: '',
          lastError: 'Invalid response format'
        };
      }
      // If we got any other response, including "Bot not found"
      else {
        // Either API returned unexpected format or error message
        const errorMessage = response.data?.message || 'Unknown error';
        
        return {
          id: botId,
          status: 'stopped',
          uptime: 0,
          memory: 0,
          cpu: 0,
          lastMessage: '',
          lastError: errorMessage
        };
      }
    })
    .catch(error => {
      console.error(`Error fetching status for bot ${botId} from bot service:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        // Try the main API instead
        return import('./api').then(api => {
          return api.default.get(`/admin/bots/${botId}/status`)
            .then(response => {
              if (response.data && response.data.status) {
                return response.data.status;
              } else if (response.data && response.data.id) {
                return response.data; // Main API may return the status object directly
              } else if (response.data && response.data.success) {
                return {
                  id: botId,
                  status: response.data.data && response.data.data.status === 'active' ? 'running' : 'stopped',
                  uptime: 0,
                  memory: 0,
                  cpu: 0,
                  lastMessage: '',
                  lastError: null
                };
              } else {
                // Fallback for unexpected response format
                return {
                  id: botId,
                  status: 'unknown',
                  uptime: 0,
                  memory: 0,
                  cpu: 0,
                  lastMessage: '',
                  lastError: 'Unexpected response format from main API'
                };
              }
            })
            .catch(mainApiError => {
              console.error(`Error fetching status from main API for bot ${botId}:`, mainApiError);
              
              // Return a fallback status object
              return {
                id: botId,
                status: 'stopped', // Default to stopped instead of error to avoid UI confusion
                uptime: 0,
                memory: 0,
                cpu: 0,
                lastMessage: '',
                lastError: 'Both bot service and main API failed to return status'
              };
            });
        });
      }
      
      // For other errors, return a fallback status object
      return {
        id: botId,
        status: 'stopped', // Changed from 'error' to 'stopped' to avoid UI confusion
        uptime: 0,
        memory: 0,
        cpu: 0,
        lastMessage: '',
        lastError: error.message || 'Network error'
      };
    });

export const startBot = (botId: string) => 
  botApi.post(`/api/bots/${botId}/start`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error starting bot ${botId} from bot service:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        // Try the main API instead
        return import('./api').then(api => {
          return api.default.post(`/admin/bots/${botId}/start`)
            .then(response => response.data)
            .catch(mainApiError => {
              console.error(`Error starting bot from main API for bot ${botId}:`, mainApiError);
              throw mainApiError;
            });
        });
      }
      
      throw error;
    });

export const stopBot = (botId: string) => 
  botApi.post(`/api/bots/${botId}/stop`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error stopping bot ${botId} from bot service:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        // Try the main API instead
        return import('./api').then(api => {
          return api.default.post(`/admin/bots/${botId}/stop`)
            .then(response => response.data)
            .catch(mainApiError => {
              console.error(`Error stopping bot from main API for bot ${botId}:`, mainApiError);
              throw mainApiError;
            });
        });
      }
      
      throw error;
    });

export const restartBot = (botId: string) => 
  botApi.post(`/api/bots/${botId}/restart`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error restarting bot ${botId} from bot service:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        // Try the main API instead
        return import('./api').then(api => {
          return api.default.post(`/admin/bots/${botId}/restart`)
            .then(response => response.data)
            .catch(mainApiError => {
              console.error(`Error restarting bot from main API for bot ${botId}:`, mainApiError);
              throw mainApiError;
            });
        });
      }
      
      throw error;
    });

export const getBotLogs = (botId: string, limit = 100) => 
  botApi.get(`/api/bots/${botId}/logs?limit=${limit}`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error fetching logs for bot ${botId}:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        return import('./api').then(api => {
          return api.default.get(`/admin/bots/${botId}/logs?limit=${limit}`)
            .then(response => response.data)
            .catch(mainApiError => {
              console.error(`Error fetching logs from main API for bot ${botId}:`, mainApiError);
              // Return empty logs array as fallback
              return { success: true, logs: [] };
            });
        });
      }
      
      // Return empty logs array as fallback
      return { success: true, logs: [] };
    });

export const getBotMetrics = (botId: string, period = 'day') => 
  botApi.get(`/api/bots/${botId}/metrics?period=${period}`)
    .then(response => response.data)
    .catch(error => {
      console.error(`Error fetching metrics for bot ${botId}:`, error);
      
      // If we get a 404, try the main API instead
      if (error.response && error.response.status === 404) {
        return import('./api').then(api => {
          return api.default.get(`/admin/bots/${botId}/metrics?period=${period}`)
            .then(response => response.data)
            .catch(mainApiError => {
              console.error(`Error fetching metrics from main API for bot ${botId}:`, mainApiError);
              // Return default metrics as fallback
              return { 
                success: true, 
                data: {
                  messagesProcessed: 0,
                  messagesSent: 0,
                  errors: 0,
                  avgResponseTime: 0,
                  timePoints: [],
                  dataPoints: []
                }
              };
            });
        });
      }
      
      // Return default metrics as fallback
      return { 
        success: true, 
        data: {
          messagesProcessed: 0,
          messagesSent: 0,
          errors: 0,
          avgResponseTime: 0,
          timePoints: [],
          dataPoints: []
        }
      };
    });

export const updateBotConfig = (botId: string, config: any) => 
  botApi.put(`/api/bots/${botId}/config`, { config })
    .then(response => response.data);

export const createBot = async (botData: any) => {
  // Ensure we use one of the valid bot types from the microservice
  // Valid types are: "moderator", "news", "weather"
  if (!["moderator", "news", "weather"].includes(botData.type)) {
    throw new Error(`Invalid bot type: ${botData.type}. Must be one of: moderator, news, weather`);
  }

  // Create the exact payload format that worked in our curl test
  const botPayload = {
    username: botData.username,
    email: botData.email,
    password: botData.password,
    type: botData.type,
    purpose: botData.purpose
  };

  if (import.meta.env.DEV) {
    console.log('Creating bot with payload:', botPayload);
  }

  try {
    // Make direct API call to bot microservice with the exact format that worked
    const response = await axios.post(
      `${import.meta.env.VITE_BOT_SERVICE_URL || 'http://localhost:3100'}/api/bots/register`,
      botPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_BOT_API_KEY || 'dev-bot-api-key'
        }
      }
    );

    if (import.meta.env.DEV) {
      console.log('Bot creation response:', response.data);
    }

    if (response.data && response.data.success) {
      // Extract bot data from successful response
      const bot = response.data.bot || {};
      
      return {
        success: true,
        message: response.data.message || 'Bot created successfully',
        data: {
          _id: bot.id || bot._id,
          id: bot.id || bot._id,
          username: bot.username || botPayload.username,
          email: bot.email || botPayload.email,
          type: bot.type || botPayload.type,
          purpose: botPayload.purpose,
          // Include other fields that the UI might need
          status: 'active',
          isBot: true
        }
      };
    } else {
      throw new Error(response.data?.message || 'Unknown error creating bot');
    }
  } catch (error) {
    console.error('Error creating bot:', error);
    
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorMsg = error.response.data.message || error.response.data.error || 'Unknown server error';
      throw new Error(`Error registering bot: ${errorMsg}`);
    }
    
    throw new Error('Error registering bot: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

// Health check
export const getBots = (page = 1, limit = 10) => 
  botApi.get(`/api/bots?page=${page}&limit=${limit}`)
    .then(response => response.data)
    .catch(error => {
      console.error('Error fetching bots from bot service:', error);
      
      // Check if the bot service is down
      if (error.isBotServiceDown) {
        console.error('Bot microservice appears to be down or unreachable');
      }
      
      // No fallback - return empty result
      return { 
        success: false, 
        message: 'Failed to fetch bots. Please ensure the bot service is running and try again.',
        bots: [] 
      };
    });

export const getBot = (botId: string) => 
  botApi.get(`/api/bots/${botId}`)
    .then(response => response.data)
    .catch(error => {
      console.error('Error fetching bot details from bot service:', error);
      if (error.isBotServiceDown) {
        throw new Error('Bot microservice is down. Please ensure the service is running and try again.');
      }
      throw error;
    });

export const deleteBot = (botId: string) => 
  botApi.delete(`/api/bots/${botId}`)
    .then(response => response.data)
    .catch(error => {
      console.error('Error deleting bot from bot service:', error);
      if (error.isBotServiceDown) {
        throw new Error('Bot microservice is down. Please ensure the service is running and try again.');
      }
      throw error;
    });

export const updateBot = (botId: string, botData: any) => 
  botApi.put(`/api/bots/${botId}`, botData)
    .then(response => response.data)
    .catch(error => {
      console.error('Error updating bot via bot service:', error);
      if (error.isBotServiceDown) {
        throw new Error('Bot microservice is down. Please ensure the service is running and try again.');
      }
      throw error;
    });

// Add the getBotTypes function
export const getBotTypes = async () => {
  // If we have a valid cache, use it
  const now = Date.now();
  if (cachedBotTypes && now - botTypesCacheTime < BOT_TYPES_CACHE_TTL) {
    if (import.meta.env.DEV) {
      console.log('Using cached bot types:', cachedBotTypes);
    }
    return cachedBotTypes;
  }

  // If recently rate limited, avoid making the request
  if (isRateLimited()) {
    console.warn('Skipping bot types fetch due to rate limiting');
    
    // Return hardcoded fallback types immediately
    const fallbackBotTypes = {
      data: [
        { value: 'chat', label: 'Chat Bot' },
        { value: 'service', label: 'Service Bot' },
        { value: 'notification', label: 'Notification Bot' }
      ],
      success: true
    };
    
    cachedBotTypes = fallbackBotTypes;
    botTypesCacheTime = now;
    return fallbackBotTypes;
  }
  
  // Define the hardcoded fallback types
  const fallbackBotTypes = {
    data: [
      { value: 'chat', label: 'Chat Bot' },
      { value: 'service', label: 'Service Bot' },
      { value: 'notification', label: 'Notification Bot' }
    ],
    success: true
  };
  
  try {
    // Create a custom axios instance for this specific request with auth headers
    const axiosWithAuth = axios.create({
      baseURL: import.meta.env.VITE_BOT_SERVICE_URL || 'http://localhost:3100',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add auth token to request
    const token = localStorage.getItem('token');
    if (token) {
      axiosWithAuth.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Add the bot API key for service-to-service communication
    axiosWithAuth.defaults.headers.common['x-api-key'] = import.meta.env.VITE_BOT_API_KEY || 'dev-bot-api-key';
    
    // Try only the two correct endpoints - use full paths instead of relying on baseURL
    const endpoints = [
      '/api/bots/types',
      '/api/bots/templates'
    ];
    
    // Track if we've had a successful response
    let success = false;
    let finalData = null;
    
    for (const endpoint of endpoints) {
      if (success) break; // Skip if we already found a working endpoint
      
      try {
        const fullEndpoint = (axiosWithAuth.defaults.baseURL + endpoint).replace(/\/+/g, '/').replace(':/', '://');
        
        if (import.meta.env.DEV) {
          console.log(`Trying bot endpoint: ${fullEndpoint}`);
        }
        
        const response = await axiosWithAuth.get(endpoint);
        
        // Debug log the actual response
        if (import.meta.env.DEV) {
          console.log(`Response from ${endpoint}:`, response.data);
        }
        
        // Try to parse the response data in various formats
        if (response.data) {
          let botTypesData = null;
          
          // Case 1: data is directly an array of bot types
          if (Array.isArray(response.data)) {
            botTypesData = response.data;
            if (import.meta.env.DEV) {
              console.log(`Found array directly in response.data, length: ${botTypesData.length}`);
            }
          } 
          // Case 2: data.data is an array of bot types (common API pattern)
          else if (response.data.data && Array.isArray(response.data.data)) {
            botTypesData = response.data.data;
            if (import.meta.env.DEV) {
              console.log(`Found array in response.data.data, length: ${botTypesData.length}`);
            }
          }
          // Case 3: data.types or another property might contain the array
          else if (response.data.types && Array.isArray(response.data.types)) {
            botTypesData = response.data.types;
            if (import.meta.env.DEV) {
              console.log(`Found array in response.data.types, length: ${botTypesData.length}`);
            }
          }
          // Case 4: response might contain bot types in a different format
          else if (typeof response.data === 'object') {
            // Try to find an array property
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                botTypesData = response.data[key];
                if (import.meta.env.DEV) {
                  console.log(`Found array in response.data.${key}, length: ${botTypesData.length}`);
                }
                break;
              }
            }
          }
          
          // If we found bot types data in any format
          if (botTypesData && botTypesData.length > 0) {
            // Check if the data is already in the expected format (has value & label)
            const isCorrectFormat = botTypesData.every((item: any) => item.value && item.label);
            
            if (isCorrectFormat) {
              finalData = { data: botTypesData, success: true };
            } else {
              // Try to convert to the expected format
              const formattedData = botTypesData.map((item: any) => {
                // If item is a string, use it for both value and label
                if (typeof item === 'string') {
                  return { value: item, label: item.charAt(0).toUpperCase() + item.slice(1) };
                }
                // If item has id/name or type/name pattern
                else if (typeof item === 'object') {
                  const value = item.id || item.type || item.value || item.key || item.code || '';
                  const label = item.name || item.label || item.title || item.description || value;
                  return { value, label };
                }
                return null;
              }).filter(Boolean);
              
              if (formattedData.length > 0) {
                finalData = { data: formattedData, success: true };
                if (import.meta.env.DEV) {
                  console.log('Converted to expected format:', formattedData);
                }
              }
            }
            
            success = true;
          }
        }
        
        if (success && finalData) {
          if (import.meta.env.DEV) {
            console.log(`Found working endpoint: ${endpoint}`);
          }
        }
      } catch (error: unknown) {
        // Only log detailed errors in development mode
        if (import.meta.env.DEV) {
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as AxiosError;
            console.warn(`Endpoint ${endpoint} failed: ${axiosError.response?.status} ${axiosError.response?.statusText}`);
            if (axiosError.response?.data) {
              console.warn('Error response data:', axiosError.response.data);
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            console.warn(`Endpoint ${endpoint} failed:`, (error as Error).message);
          }
        }
      }
    }
    
    if (success && finalData) {
      // Cache the successful response
      cachedBotTypes = finalData;
      botTypesCacheTime = now;
      return finalData;
    }
    
    // All specified endpoints failed, use hardcoded types
    if (import.meta.env.DEV) {
      console.warn('All API endpoints failed, using hardcoded bot types');
    }
    
    // Cache the fallback response
    cachedBotTypes = fallbackBotTypes;
    botTypesCacheTime = now;
    
    return fallbackBotTypes;
  } catch (error) {
    // This is only reached for rate limiting or other unhandled errors
    if (import.meta.env.DEV) {
      console.error('Unhandled error in getBotTypes:', error);
    }
    
    // For any error, use the fallback
    cachedBotTypes = fallbackBotTypes;
    botTypesCacheTime = now;
    
    return fallbackBotTypes;
  }
};

export default {
  getActiveBots,
  getBotStatus,
  startBot,
  stopBot,
  restartBot,
  getBotLogs,
  getBotMetrics,
  updateBotConfig,
  createBot,
  testBotConnection,
  getBotServiceHealth,
  getBots,
  getBot,
  deleteBot,
  updateBot,
  getBotTypes
}; 