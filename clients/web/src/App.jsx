import { useState, useEffect, useContext, useRef, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import socketService from './services/socketService'
import apiService from './services/apiService'
import authService from './services/authService'
// Replace direct imports with lazy loaded components
import OfflineFallback from './components/OfflineFallback'
import { AppContext } from './context/AppContext'
import { 
  createFallbackLocation, 
  createVariedLocation, 
  createFuzzyLocation,
  filterOldMessages
} from './utils/locationUtils'
import { createNotification } from './utils/notificationUtils'
import './App.css'

// Lazy load components
const AppContent = lazy(() => import('./components/AppContent'));
const Auth = lazy(() => import('./components/auth/Auth'));
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Profile = lazy(() => import('./components/Profile'));

// Component loading fallback
const ComponentLoader = () => (
  <div className="component-loader">
    <div className="spinner-small"></div>
  </div>
);

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notifications, setNotifications] = useState([])
  
  // Add context
  const { isOffline } = useContext(AppContext);
  
  // Define state for messages timestamp (used for refreshing)
  const [setMessagesTimestamp] = useState(Date.now());

  // Create refs for functions and state to prevent stale closures
  const messagesRef = useRef(messages);
  const onlineUsersRef = useRef(onlineUsers);
  const userRef = useRef(user);
  const notificationsRef = useRef(notifications);
  
  // Helper function to update messages timestamp - define this early
  const updateMessagesTimestamp = useCallback(() => {
    setMessagesTimestamp(Date.now());
  }, [setMessagesTimestamp]);

  // Forward declare function references with useRef
  const fetchMessagesWithoutResetRef = useRef(null);
  const updateMessagesTimestampRef = useRef(updateMessagesTimestamp);
  
  // Keep refs updated with current values
  useEffect(() => {
    messagesRef.current = messages;
    onlineUsersRef.current = onlineUsers;
    userRef.current = user;
    notificationsRef.current = notifications;
    updateMessagesTimestampRef.current = updateMessagesTimestamp;
  }, [messages, onlineUsers, user, notifications, updateMessagesTimestamp]);
  
  // Function to navigate to profiles when receiving notifications
  
  // Update the addMessage function to include image support
  const addMessage = useCallback((sender, content, isReceived, timestamp = new Date(), location = null, messageId = null, image = null) => {
 
    
    setMessages(prevMessages => {
      // Create new message object
      const newMessage = {
        sender: sender,
        content: content,
        timestamp: timestamp,
        isReceived: isReceived,
        location: location || null,
        dbId: messageId || null,
        image: image || null,
      };
      
      // Add to messages array, maintaining sort order by timestamp
      const updatedMessages = [...prevMessages, newMessage].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      // Optionally filter out old messages to prevent the array from growing too large
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      return filterOldMessages(updatedMessages, oneDayAgo);
    });
  }, []);
  
  // Add global fetch tracking to coordinate between components
  const MESSAGE_FETCH_STATES = {
    IDLE: 'idle',
    FETCHING: 'fetching',
    SUCCESS: 'success',
    ERROR: 'error'
  };

  // Add a debounce state to prevent excessive API calls 
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [fetchState, setFetchState] = useState(MESSAGE_FETCH_STATES.IDLE);
  
  // Fetch messages function that doesn't reset view
  const fetchMessagesWithoutReset = useCallback(async (retryCount = 0) => {
    // Skip if offline
    if (isOffline) {
      return;
    }
    
    // Implement debouncing - prevent calling the API more than once every 10 seconds
    const now = Date.now();
    
    // Update the last fetch time and set fetch state
    setLastFetchTime(now);
    setFetchState(MESSAGE_FETCH_STATES.FETCHING);
    
    // Use sessionStorage to track fetch count and prevent excessive fetches
    const fetchCount = parseInt(sessionStorage.getItem('messageFetchCount') || '0');
    sessionStorage.setItem('messageFetchCount', (fetchCount + 1).toString());
    
    try {
      
      const response = await apiService.getMessages();
      
      if (response && response.success) {
        setFetchState(MESSAGE_FETCH_STATES.SUCCESS);
        
        // Check if messages array exists and has items
        if (response.messages && Array.isArray(response.messages)) {
          
          // Format messages correctly for the MapView component
          const formattedMessages = response.messages.map(msg => {
            // Create timestamp as a Date object for proper time formatting
            let timestamp;
            try {
              // Try to parse timestamps from various formats
              if (msg.createdAt) {
                if (typeof msg.createdAt === 'string') {
                  timestamp = new Date(msg.createdAt);
                } else if (msg.createdAt.$date) { // MongoDB format
                  timestamp = new Date(msg.createdAt.$date);
                } else {
                  timestamp = new Date(msg.createdAt);
                }
              } else if (msg.timestamp) {
                timestamp = new Date(msg.timestamp);
              } else {
                timestamp = new Date(); // Fallback to current time
              }
              
              // Check if timestamp is valid
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date(); // Fallback to current time
              }
            } catch {
              timestamp = new Date(); // Fallback to current time
            }
            
            return {
              // Message ID - could be _id or messageId
              dbId: msg._id || msg.id || msg.messageId || null,
              
              // Sender information
              sender: msg.senderUsername || msg.sender || 'Unknown',
              
              // Content - could be text or content
              content: msg.text || msg.content || '',
              
              // Timestamp as Date object
              timestamp: timestamp,
              
              // Image URL if available
              image: msg.image || null,
              
              // Location data
              location: msg.location || null,
              
              // Likes information
              likesCount: msg.likesCount || (msg.likes ? msg.likes.length : 0) || 0,
              likedByCurrentUser: msg.likedByCurrentUser || false,
              
              // Mark as received from server
              isReceived: true
            };
          });
          
          // Filter messages to only show those from the last 30 minutes
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentMessages = formattedMessages.filter(msg => {
            // Make sure we're comparing Date objects
            const messageTime = msg.timestamp instanceof Date ? 
              msg.timestamp : new Date(msg.timestamp);
            
            // Check if message is from the last 30 minutes
            return messageTime >= thirtyMinutesAgo;
          });
      
          // Update messages state efficiently by comparing with previous messages
          // This helps prevent unnecessary re-renders
          setMessages(prevMessages => {
            // If the message count is the same, check if the content is actually different
            if (prevMessages.length === recentMessages.length) {
              // Check if the messages are actually different by comparing IDs
              const prevIds = new Set(prevMessages.map(msg => msg.dbId));
              const newIds = new Set(recentMessages.map(msg => msg.dbId));
              
              // If all IDs match, check if any message content has changed
              if (prevIds.size === newIds.size && 
                  [...prevIds].every(id => newIds.has(id))) {
                
                // Check if any message content has changed
                const hasChanges = recentMessages.some(newMsg => {
                  const prevMsg = prevMessages.find(p => p.dbId === newMsg.dbId);
                  if (!prevMsg) return true;
                  
                  // Compare relevant fields
                  return (
                    prevMsg.content !== newMsg.content ||
                    prevMsg.likesCount !== newMsg.likesCount ||
                    prevMsg.likedByCurrentUser !== newMsg.likedByCurrentUser
                  );
                });
                
                // If no changes, return the previous messages to prevent re-render
                if (!hasChanges) {
                return prevMessages;
                }
              }
            }
            
            // If we get here, there are actual changes, so return the new messages
           return recentMessages;
          });
        } else { 
          // If no messages and we haven't retried too many times, try again
          if (retryCount < 2) {
            setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 1000);
            return;
          }
        }
        
        // Update online users
        if (response.onlineUsers) {
          setOnlineUsers(response.onlineUsers);
        }
        // Update messages timestamp
        updateMessagesTimestamp();
      } else {
        setFetchState(MESSAGE_FETCH_STATES.ERROR);
        
        // If error response and we haven't retried too many times, try again
        // But only retry once (instead of twice) and with a longer delay
        if (retryCount < 1) {
          setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 5000); // Wait 5 seconds before retry
          return;
        }
      }
    } catch (error) {
      setFetchState(MESSAGE_FETCH_STATES.ERROR);
      
      // Check for rate limiting (429) errors
      if (error.response && error.response.status === 429) {
        // Don't retry immediately - wait at least 30 seconds
        return;
      }
      
      // If error and we haven't retried too many times, try again
      // But only retry once (instead of twice) and with a longer delay
      if (retryCount < 1) {
        setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 5000); // Wait 5 seconds before retry
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOffline, updateMessagesTimestamp, lastFetchTime, fetchState]);

  // Set up the fetchMessagesWithoutResetRef after the function is defined
  useEffect(() => {
    fetchMessagesWithoutResetRef.current = fetchMessagesWithoutReset;
  }, [fetchMessagesWithoutReset]);

  // Add a ref to track socket initialization
  const socketInitializedRef = useRef(false);
  
  // Socket connection management with dependency on user only
  useEffect(() => {
    // Only initialize if we have a user and haven't already initialized
    if (!user) return;
    
    // Reset socket initialization state if user changes
    if (socketInitializedRef.current && user.username) {
      socketInitializedRef.current = false;
    }

    // Skip if we've already initialized for this user
    if (socketInitializedRef.current) {
      return;
    }
    
    // Check if we should connect based on the connection attempt history
    const connectionAttemptKey = 'socket_connection_attempts';
    const connectionTimeKey = 'socket_connection_last_attempt';
    const now = Date.now();
    
    // Get connection attempt history
    const connectionAttemptsStr = sessionStorage.getItem(connectionAttemptKey) || '0';
    const connectionAttempts = parseInt(connectionAttemptsStr, 10);
    const lastAttemptStr = sessionStorage.getItem(connectionTimeKey) || '0';
    const lastAttempt = parseInt(lastAttemptStr, 10);
    
    // Define maximum attempts and cooldown period
    const maxConnectionAttempts = 5;
    const connectionCooldown = 30000; // Reduced to 30 seconds from 60 seconds
    
    // Check if we're in the cooldown period
    const timeSinceLastAttempt = now - lastAttempt;
    
    // Only apply cooldown if we've had multiple connection attempts
    if (connectionAttempts > 2 && lastAttempt && timeSinceLastAttempt < connectionCooldown) {
      return;
    } 
    // Prevent excessive reconnection attempts over time
    else if (connectionAttempts >= maxConnectionAttempts) {
      // Reset attempts counter after a full cooldown period to avoid permanent lockout
      if (timeSinceLastAttempt > connectionCooldown * 2) {
        sessionStorage.setItem(connectionAttemptKey, '0');
      } else {
        return;
      }
    }
    
    // Update connection attempt count and time
    sessionStorage.setItem(connectionAttemptKey, (connectionAttempts + 1).toString());
    sessionStorage.setItem(connectionTimeKey, now.toString());
    
    
    try {
      // Define socket callbacks immediately to avoid duplicating code
      const socketCallbacks = {
        onConnect: () => {
          setIsConnected(true);
          setConnectionError(null);
          // Mark as initialized once connection is successful
          socketInitializedRef.current = true;
          // Reset connection attempts on successful connection
          sessionStorage.setItem(connectionAttemptKey, '0');
        },
        onConnectError: () => {
          setIsConnected(false);
          setConnectionError('Could not connect to server. Retrying...');
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onAuthenticated: () => {
          // Fetch messages only if we haven't already fetched them recently
          const now = Date.now();
          const timeSinceLastFetch = now - lastFetchTime;
          const minTimeBetweenFetches = 5000; // 5 seconds
          
          if (timeSinceLastFetch > minTimeBetweenFetches && fetchState !== MESSAGE_FETCH_STATES.FETCHING) {
            fetchMessagesWithoutReset();
          }
        },
        onAuthenticationFailed: (data) => {
          setConnectionError('Authentication failed. Please log in again.');
          // Clear token and redirect to login if authentication fails
          if (data && data.error === 'Invalid authentication token') {
            handleLogout();
          }
        },
        onWelcome: () => {},
        onNewMessage: () => {},
        onMessageAck: (data) => {
        // Update local message with server-assigned ID
          if (data && data.dbId) {
            setMessages(prevMessages => 
              prevMessages.map(msg => {
                // Find messages without dbId that match this message's timestamp (approximately)
                const msgTimestamp = new Date(msg.timestamp).getTime();
                const dataTimestamp = new Date(data.timestamp).getTime();
                const timeDiff = Math.abs(msgTimestamp - dataTimestamp);
                
                // If it's a recent message (within last 10 seconds) from this user without dbId 
                // it's likely the one we just sent
                if (!msg.dbId && msg.sender === user?.username && timeDiff < 10000) {
                  return {
                    ...msg,
                    dbId: data.dbId
                  };
                }
                return msg;
              })
            );
          }
        },
        onRefreshMessages: () => {
          // Check if we can fetch messages based on timing and state
          const now = Date.now();
          const timeSinceLastFetch = now - lastFetchTime;
          const minTimeBetweenFetches = 10000; // 10 seconds
          
          if (fetchState !== MESSAGE_FETCH_STATES.FETCHING && timeSinceLastFetch > minTimeBetweenFetches) {
            if (fetchMessagesWithoutResetRef.current) {
              fetchMessagesWithoutResetRef.current();
            }
          }
        },
        onUserStatusChange: (data) => {
          // Update user status in the state
          if (data && data.username) {
            setOnlineUsers(prevOnlineUsers => {
              const updatedUsers = { ...prevOnlineUsers };
              updatedUsers[data.username] = data.isOnline;
              return updatedUsers;
            });
          }
        },
        onMessageLiked: (data) => {
          // Update any displayed message with the new like count
          if (data && data.messageId) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.dbId === data.messageId ? 
                  { ...msg, likesCount: data.likesCount } : 
                  msg
              )
            );
            
            // If the current user liked this message, update their likedMessages
            if (user && data.likedByUsername === user.username) {
              // Force a refresh of profile cards with a new timestamp
              setMessagesTimestamp(Date.now());
            }
          }
        },
        onMessageUnliked: (data) => {
          // Update any displayed message with the new like count
          if (data && data.messageId) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.dbId === data.messageId ? 
                  { ...msg, likesCount: data.likesCount } : 
                  msg
              )
            );
            
            // If the current user unliked this message, update their likedMessages
            if (user && data.unlikedByUsername === user.username) {
              // Force a refresh of profile cards with a new timestamp
              setMessagesTimestamp(Date.now());
            }
          }
        },
        onMessageDeleted: (data) => {
          
          // Remove the deleted message from the messages list
          if (data && data.messageId) {
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg.dbId !== data.messageId)
            );
            
            // Force a refresh of profile cards since a message was deleted
            setMessagesTimestamp(Date.now());
          }
        }
      };
      
      // Connect to the socket
      if (user && user.username) {
        socketService.connect(socketCallbacks, user.username);
      } else {
        setConnectionError('Cannot connect - invalid user or missing username');
      }
      
    } catch {
      setConnectionError('Error connecting to server. Please try again later.');
      setIsConnected(false);
    }
    
    // Don't disconnect on component updates - only on unmount
  }, [user]);
  
  // Separate cleanup effect for socket disconnection - only runs on component unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
      socketInitializedRef.current = false;
    };
  }, []);
  
  // Periodically check server connection if in fallback mode
  useEffect(() => {
    if (!user || !socketService.isFallbackMode()) {
      return; // Only run this effect if logged in and in fallback mode
    }
    
    
    // Check server every 30 seconds to see if it's back up
    const serverCheckInterval = setInterval(async () => {
      
   
        const serverStatus = await socketService.checkServerStatus();
        
        if (serverStatus.success) {
          clearInterval(serverCheckInterval);
          
          // Update the connection state (will trigger the main socket connection effect)
          setConnectionError(null);
          
          // Disable fallback mode
          socketService.disableFallbackMode();
        } 
     
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(serverCheckInterval);
    };
  }, [user, socketService.isFallbackMode()]);

  // Check for authentication on initial load
  useEffect(() => {
    
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        // Check if user is logged in using token from localStorage
        const userData = await authService.checkLoginStatus();
   
        if (userData) {
          handleAuthSuccess(userData, false);
        } else {
          // User is not authenticated
          setUser(null);
        }
      } catch {
        // Error handling - just reset user state
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Check for dark mode preference in localStorage
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
      setIsDarkMode(storedDarkMode === 'true');
    } else {
      // If no preference is stored, check for system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDarkMode);
    }
  }, []);
  
  // Add event listener for map-initiated message fetching
  // NOTE: This approach has been replaced with direct prop passing.
  // The handleRefreshMap function below is now passed directly to the MapView component.
  
  // Create a safe wrapper for fetchMessagesWithoutReset that includes debouncing
  const handleRefreshMap = useCallback(() => {
    try {
      // Check if we're already fetching or have fetched recently
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const minTimeBetweenFetches = 5000; // 5 seconds
      
      if (fetchState === MESSAGE_FETCH_STATES.FETCHING) {
        return;
      }
      
      if (timeSinceLastFetch < minTimeBetweenFetches) {
        // Wait until the cooling period is over
        setTimeout(() => {
          try {
            fetchMessagesWithoutReset();
          } catch {
            // Set fetch state back to idle so future fetches can proceed
            setFetchState(MESSAGE_FETCH_STATES.IDLE);
            setIsLoading(false);
          }
        }, minTimeBetweenFetches - timeSinceLastFetch);
        
        return;
      }
      
      // If we get here, it's safe to fetch immediately
      fetchMessagesWithoutReset();
    } catch {
      // Set fetch state back to idle so future fetches can proceed
      setFetchState(MESSAGE_FETCH_STATES.IDLE);
      setIsLoading(false);
    }
  }, [lastFetchTime, fetchState, fetchMessagesWithoutReset]);

  // Get user location and set up auto-update
  useEffect(() => {
    // Define the function to get user location
    const getUserLocation = () => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        setUserLocation(() => {
          return {
            latitude: 40.7128, // NYC default
            longitude: -74.0060,
            fuzzyLocation: true,
            error: "Geolocation not supported"
          };
        });
        return;
      }
      
      const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };
      
      // Try to get high accuracy position first
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            fuzzyLocation: false,
            error: null,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setUserLocation(location);
        },
        () => {
          // Try again with lower accuracy if high accuracy fails
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                fuzzyLocation: false,
                error: null,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              };
              setUserLocation(location);
            },
            (err) => {
              // Fallback to default location
              setUserLocation({
                latitude: 40.7128, // NYC default
                longitude: -74.0060,
                fuzzyLocation: true,
                error: err.message
              });
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
          );
        },
        geolocationOptions
      );
    };
    
    // Only get location if user is logged in
    if (user) {
      getUserLocation();
    }
    
    // Set up interval to refresh location only when user is logged in
    const locationInterval = setInterval(() => {
      if (user) {
        getUserLocation();
      }
    }, 300000); // Every 5 minutes (300000 ms)
    
    // Setup visibility change listener to request location when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        getUserLocation();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up interval and event listener on component unmount
    return () => {
      clearInterval(locationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]); // Include user in the dependency array

  // Handle successful authentication
  const handleAuthSuccess = (userData, shouldRedirect = false) => {
    setUser(userData.user || userData); // Handle both cases: userData or userData.user
    
    // Set dark mode preference from user data if available
    const userObject = userData.user || userData;
    
    if (userObject && userObject.darkMode !== undefined) {
      setIsDarkMode(userObject.darkMode);
    }
    
    // Check if we're already fetching or have fetched messages recently
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const minTimeBetweenFetches = 5000; // 5 seconds
    const fetchInitiated = sessionStorage.getItem('fetchMessagesInitiated');
    
    // Only fetch messages if:
    // 1. We haven't fetched messages in this session yet
    // 2. We're not currently fetching messages
    // 3. It's been more than 5 seconds since the last fetch
    if (!fetchInitiated && fetchState !== MESSAGE_FETCH_STATES.FETCHING && timeSinceLastFetch > minTimeBetweenFetches) {
      // Set the flag in session storage so we don't fetch multiple times
      sessionStorage.setItem('fetchMessagesInitiated', 'true');
      
      // Reset message fetch count for the session
      sessionStorage.setItem('messageFetchCount', '0');
      
      // Fetch messages once after login with a short delay to avoid request collisions
      setTimeout(() => {
        fetchMessagesWithoutReset(0, true); // Force refresh
      }, 1000); // 1 second delay
    } 
    
    // Clear the fetch initiated flag when the page is refreshed or closed
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('fetchMessagesInitiated');
    });
    
    // Redirect if requested (typically on explicit login vs token-based auth)
    if (shouldRedirect) {
      // For React Router v6
      window.location.href = '/';
    }
  };

  // Handle user logout
  const handleLogout = () => {
    // Disconnect from socket
    socketService.disconnect();
    
    // Call the authService logout method to clean up all auth-related storage
    authService.logout();
    
    // Reset application state
    setUser(null);
    setMessages([]);
    setOnlineUsers({});
    
    // Save current dark mode preference to localStorage
    localStorage.setItem('darkMode', isDarkMode);
    
    // Redirect to auth page
    window.location.href = '/auth';
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Save to localStorage
    localStorage.setItem('darkMode', newDarkMode);
    
    // Update user preference in the database if logged in
    if (user) {
      updateUserDarkModePreference(newDarkMode);
    }
  };
  
  // Update user dark mode preference in the database
  const updateUserDarkModePreference = async (darkMode) => {
   
      await authService.updateProfile({ darkMode });
    
  };
  
  // When dark mode changes, apply it to the document
  useEffect(() => {
    // Add or remove dark-mode class from both root elements
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }

    // Additionally, store the preference in local storage for persistence
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Handle clearing all notifications
  const handleClearNotifications = () => {
    setNotifications(() => []);
  };

  // Periodically refresh messages when the user is logged in
  useEffect(() => {
    // Skip if user is not logged in
    if (!user) {
      return;
    }
    
    
    // Set up interval to refresh messages every minute
    const messageRefreshInterval = setInterval(() => {
      fetchMessagesWithoutReset();
    }, 60000); // Every 60 seconds
    
    // Clean up interval on component unmount or when user changes
    return () => {
      clearInterval(messageRefreshInterval);
    };
  }, [user]); // Re-run when user changes

  // Create a function to check if user can send a message (30 minute cooldown)
  const canUserSendMessage = () => {
    if (!user || !messages || messages.length === 0) return true;
    
    // Filter messages by current user
    const userMessages = messages.filter(msg => msg.sender === user.username);
    if (userMessages.length === 0) return true;
    
    // Get user's most recent message timestamp
    const latestUserMessage = userMessages.reduce((latest, current) => {
      return new Date(latest.timestamp) > new Date(current.timestamp) ? latest : current;
    }, userMessages[0]);
    
    // Calculate time difference
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const now = new Date();
    const lastMessageTime = new Date(latestUserMessage.timestamp);
    const timeDifference = now - lastMessageTime;
    
    return timeDifference >= thirtyMinutesInMs;
  };

  // Calculate time remaining before user can share another update
  const getTimeRemainingBeforeNextMessage = () => {
    if (!user || !messages || messages.length === 0) return 0;
    
    // Filter messages by current user
    const userMessages = messages.filter(msg => msg.sender === user.username);
    if (userMessages.length === 0) return 0;
    
    // Get user's most recent message timestamp
    const latestUserMessage = userMessages.reduce((latest, current) => {
      return new Date(latest.timestamp) > new Date(current.timestamp) ? latest : current;
    }, userMessages[0]);
    
    // Calculate time difference
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const now = new Date();
    const lastMessageTime = new Date(latestUserMessage.timestamp);
    const timeDifference = now - lastMessageTime;
    
    return Math.max(0, thirtyMinutesInMs - timeDifference);
  };

  // Handle socket message (sending)
  const handleSocketMessage = useCallback(async (message, formData = null) => {
    if (!isConnected) {
      return { error: 'Cannot send message while disconnected' };
    }
    
    if (!user) {
      return { error: 'Cannot send message while not logged in' };
    }

    // Check if user can send a message (30 minutes since last message)
    if (!canUserSendMessage()) {
      const timeRemaining = getTimeRemainingBeforeNextMessage();
      return { 
        error: 'You can only send a message every 30 minutes',
        timeRemaining 
      };
    }
    
    const currentTimestamp = Date.now();
    let useFuzzyLocation = true; // Default to true for privacy
    
    // Extract fuzzyLocation setting from formData if available
    if (formData && formData.get) {
      useFuzzyLocation = formData.get('fuzzyLocation') === 'true';
    }

    // Ensure we have location data - create a fallback location only if needed
    let messageLocation = userLocation;
    if (!messageLocation || messageLocation.error) {
      // Generate fallback location only if no valid location exists
      messageLocation = createFallbackLocation(messages);
    } else if (messageLocation.fuzzyLocation) {
      // Only vary locations that are already fuzzy
      messageLocation = createVariedLocation(messageLocation);
    } else {
      // Apply fuzzy location if requested
      messageLocation = createFuzzyLocation(messageLocation, useFuzzyLocation);
    }

    // If formData is provided, send with image upload
    if (formData) {
      try {
        // Send the message with image via API
        const response = await apiService.sendMessageWithImage(message, formData, messageLocation);
        
        if (response.success) {
          // Message with image was successfully sent and saved to the database
          // The server will broadcast to all clients including this one
          
          // Add a temporary local version of the message for immediate feedback
          if (response.messageId && response.imageUrl) {
            addMessage(
              user.username, 
              message, 
              false, 
              currentTimestamp, 
              messageLocation, 
              response.messageId, 
              response.imageUrl
            );
          }
        }
      } catch {
        // Add a local error message
        addMessage('Error', 'Failed to send your message with image. Please try again.', true, currentTimestamp);
      }
    } else {
      // Handle regular text-only messages
      try {
        // Add our message locally with a temporary ID first for immediate feedback
        addMessage(user.username, message, false, currentTimestamp, messageLocation);
        
        // Use socket to send message, ensuring consistency with bots client
        socketService.sendMessage(message, user.username, messageLocation);
        
        // We don't need to do anything else here - the server will broadcast
        // the message to all clients and trigger a refresh event
      } catch {
        addMessage('Error', 'Failed to send your message. Please try again.', true, currentTimestamp);
      }
    }
  }, [isConnected, userLocation, messages, user, addMessage]);
  
  // Check for notification permissions on mount
  useEffect(() => {
    if (user) {
      // Check if notifications are supported and if we have permission
      if (socketService.areNotificationsSupported()) {
        // Check if permission was just granted in this session
        const permissionJustGranted = sessionStorage.getItem('notificationPermissionJustGranted');
        
        if (Notification.permission === 'granted' && permissionJustGranted) {
          // Create welcome notification only when permissions were just granted
          const welcomeNotification = createNotification({
            sender: user.username,
            messagePreview: 'Notifications enabled successfully!',
            timestamp: new Date()
          });
          
          if (welcomeNotification) {
            setNotifications(prev => [...prev, welcomeNotification]);
          }
          
          // Remove the flag so notification doesn't show again on reload
          sessionStorage.removeItem('notificationPermissionJustGranted');
        } else if (Notification.permission === 'default') {
          // Ask for permission when the user logs in
          socketService.requestNotificationPermission()
            .then(granted => {
              if (granted) {
                // Notification about successful permission granting will be handled 
                // by the next effect run, thanks to the sessionStorage flag
              }
            })
        }
      }
    }
  }, [user]);

  // If offline, show the offline fallback
  if (isOffline) {
    return <OfflineFallback messages={messages} isDarkMode={isDarkMode} />;
  }

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <div className={`app-loading ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // If not logged in, show the auth screen
  if (!user) {
    return (
      <Router>
        <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
          {/* Show PWA install prompt */}
          <PWAInstallPrompt isDarkMode={isDarkMode} />
          
          {/* Show landing page or auth component based on route */}
          <Routes>
            <Route path="/" element={<LandingPage isDarkMode={isDarkMode} />} />
            <Route path="/auth/*" element={<Auth onAuthSuccess={(userData) => {
              handleAuthSuccess(userData, true);
            }} isDarkMode={isDarkMode} />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // Main app content
  return (
    <>
      <Router>
        {isOffline && <OfflineFallback />}
        <PWAInstallPrompt />
        
        <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
          {user ? (
            <Suspense fallback={<ComponentLoader />}>
              <Routes>
                <Route 
                  path="/*" 
                  element={
                    <AppContent 
                      user={user}
                      onlineUsers={onlineUsers}
                      messages={messages}
                      handleSocketMessage={handleSocketMessage}
                      isConnected={isConnected}
                      connectionError={connectionError}
                      handleLogout={handleLogout}
                      userLocation={userLocation}
                      isDarkMode={isDarkMode}
                      toggleDarkMode={toggleDarkMode}
                      notifications={notifications}
                      onClearNotifications={handleClearNotifications}
                      isLoading={isLoading}
                      canUserSendMessage={canUserSendMessage}
                      getTimeRemainingBeforeNextMessage={getTimeRemainingBeforeNextMessage}
                      handleRefreshMap={handleRefreshMap}
                    />
                  } 
                />
                <Route 
                  path="/profile/:username" 
                  element={
                    <Profile 
                      user={user}
                      isDarkMode={isDarkMode}
                      handleLogout={handleLogout}
                      toggleDarkMode={toggleDarkMode}
                    />
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          ) : (
            <Suspense fallback={<ComponentLoader />}>
              <Routes>
                <Route path="/login" element={
                  <Auth 
                    onAuthSuccess={handleAuthSuccess} 
                    isDarkMode={isDarkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
                } />
                <Route path="/" element={<LandingPage isDarkMode={isDarkMode} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          )}
        </div>
      </Router>
    </>
  );
}

export default App;