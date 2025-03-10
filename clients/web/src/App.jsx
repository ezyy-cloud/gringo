import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import socketService from './services/socketService'
import apiService from './services/apiService'
import authService from './services/authService'
import AppContent from './components/AppContent'
import Auth from './components/auth/Auth'
import OfflineFallback from './components/OfflineFallback'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import LandingPage from './components/LandingPage'
import { AppContext } from './context/AppContext'
import { 
  createFallbackLocation, 
  createVariedLocation, 
  createFuzzyLocation,
  filterOldMessages
} from './utils/locationUtils'
import { createNotification } from './utils/notificationUtils'
import './App.css'

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
  
  // Define state for messages timestamp (used for refreshing)
  const [messagesTimestamp, setMessagesTimestamp] = useState(Date.now())

  // Add context
  const { isOffline } = useContext(AppContext);
  
  // Create refs for functions and state to prevent stale closures
  const messagesRef = useRef(messages);
  const onlineUsersRef = useRef(onlineUsers);
  const userRef = useRef(user);
  const notificationsRef = useRef(notifications);
  
  // Helper function to update messages timestamp - define this early
  const updateMessagesTimestamp = useCallback(() => {
    setMessagesTimestamp(Date.now());
  }, []);

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
  const navigateToProfile = useCallback((username) => {
    window.location.href = `/profile/${username}`;
  }, []);
  
  // Update the addMessage function to include image support
  const addMessage = useCallback((sender, content, isReceived, timestamp = new Date(), location = null, messageId = null, image = null) => {
    // Check if the message is a system message (convert to console log)
    const isSystemMessage = sender === 'System' || sender === 'Server';
    
    if (isSystemMessage) {
      console.log(`System message: ${content}`);
      return;
    }
    
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
  const fetchMessagesWithoutReset = useCallback(async (retryCount = 0, forceRefresh = false) => {
    // Skip if offline
    if (isOffline) {
      console.log('🔄 fetchMessagesWithoutReset: Offline, skipping message fetch');
      return;
    }
    
    // Skip if already fetching to prevent duplicate requests
    if (fetchState === MESSAGE_FETCH_STATES.FETCHING && !forceRefresh) {
      console.log('🔄 fetchMessagesWithoutReset: Already fetching messages, skipping this request');
      return;
    }
    
    // Implement debouncing - prevent calling the API more than once every 10 seconds
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const minTimeBetweenFetches = 10000; // 10 seconds
    
    if (timeSinceLastFetch < minTimeBetweenFetches && retryCount === 0 && !forceRefresh) {
      console.log(`🔄 fetchMessagesWithoutReset: Skipping fetch - too soon (${timeSinceLastFetch}ms since last fetch)`);
      return;
    }
    
    // Update the last fetch time and set fetch state
    setLastFetchTime(now);
    setFetchState(MESSAGE_FETCH_STATES.FETCHING);
    
    // Use sessionStorage to track fetch count and prevent excessive fetches
    const fetchCount = parseInt(sessionStorage.getItem('messageFetchCount') || '0');
    sessionStorage.setItem('messageFetchCount', (fetchCount + 1).toString());
    
    console.log(`🔄 fetchMessagesWithoutReset: Starting to fetch messages (Count: ${fetchCount + 1})`);
    
    try {
      setIsLoading(true);
      
      console.log('🔄 fetchMessagesWithoutReset: About to call apiService.getMessages()');
      const response = await apiService.getMessages();
      console.log('🔄 fetchMessagesWithoutReset: Response received:', response);
      
      if (response && response.success) {
        console.log('🔄 fetchMessagesWithoutReset: Response was successful');
        setFetchState(MESSAGE_FETCH_STATES.SUCCESS);
        
        // Check if messages array exists and has items
        if (response.messages && Array.isArray(response.messages)) {
          console.log(`🔄 fetchMessagesWithoutReset: Found ${response.messages.length} messages in response`);
          
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
                console.log('🔄 Invalid timestamp for message:', msg);
                timestamp = new Date(); // Fallback to current time
              }
            } catch (error) {
              console.error('🔄 Error parsing timestamp:', error);
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
          
          console.log('🔄 Formatted messages for MapView:', formattedMessages);
          
          // Filter messages to only show those from the last 30 minutes
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentMessages = formattedMessages.filter(msg => {
            // Make sure we're comparing Date objects
            const messageTime = msg.timestamp instanceof Date ? 
              msg.timestamp : new Date(msg.timestamp);
            
            // Check if message is from the last 30 minutes
            return messageTime >= thirtyMinutesAgo;
          });
          
          console.log(`🔄 Filtered to ${recentMessages.length} messages from the last 30 minutes (out of ${formattedMessages.length} total)`);
          
          // Check how many messages have location data
          const messagesWithLocation = recentMessages.filter(msg => 
            msg.location && msg.location.latitude && msg.location.longitude
          );
          console.log(`🔄 fetchMessagesWithoutReset: ${messagesWithLocation.length} out of ${recentMessages.length} messages have valid location data`);
          
          // If we have messages with location, log an example
          if (messagesWithLocation.length > 0) {
            console.log('🔄 fetchMessagesWithoutReset: Example message with location:', messagesWithLocation[0]);
          } else {
            console.log('🔄 fetchMessagesWithoutReset: No messages with location found.');
          }
          
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
                  console.log('🔄 fetchMessagesWithoutReset: No changes in messages, preventing re-render');
                  return prevMessages;
                }
              }
            }
            
            // If we get here, there are actual changes, so return the new messages
            console.log('🔄 fetchMessagesWithoutReset: Setting messages state with filtered data');
            return recentMessages;
          });
        } else {
          console.log('🔄 fetchMessagesWithoutReset: No messages array in response or empty array', response.messages);
          
          // If no messages and we haven't retried too many times, try again
          if (retryCount < 2) {
            console.log(`🔄 fetchMessagesWithoutReset: Retrying (attempt ${retryCount + 1})`);
            setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 1000);
            return;
          }
        }
        
        // Update online users
        if (response.onlineUsers) {
          console.log('🔄 fetchMessagesWithoutReset: Setting onlineUsers state');
          setOnlineUsers(response.onlineUsers);
        } else {
          console.log('🔄 fetchMessagesWithoutReset: No onlineUsers in response');
        }
        
        // Update messages timestamp
        console.log('🔄 fetchMessagesWithoutReset: Updating messages timestamp');
        updateMessagesTimestamp();
      } else {
        console.error('🔄 fetchMessagesWithoutReset: Response was not successful', response);
        setFetchState(MESSAGE_FETCH_STATES.ERROR);
        
        // If error response and we haven't retried too many times, try again
        // But only retry once (instead of twice) and with a longer delay
        if (retryCount < 1) {
          console.log(`🔄 fetchMessagesWithoutReset: Retrying after error (attempt ${retryCount + 1})`);
          setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 5000); // Wait 5 seconds before retry
          return;
        }
      }
    } catch (error) {
      console.error('🔄 fetchMessagesWithoutReset: Error fetching messages:', error);
      setFetchState(MESSAGE_FETCH_STATES.ERROR);
      
      // Check for rate limiting (429) errors
      if (error.response && error.response.status === 429) {
        console.warn('🔄 fetchMessagesWithoutReset: Rate limited (429), backing off');
        // Don't retry immediately - wait at least 30 seconds
        return;
      }
      
      // If error and we haven't retried too many times, try again
      // But only retry once (instead of twice) and with a longer delay
      if (retryCount < 1) {
        console.log(`🔄 fetchMessagesWithoutReset: Retrying after exception (attempt ${retryCount + 1})`);
        setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 5000); // Wait 5 seconds before retry
        return;
      }
    } finally {
      console.log('🔄 fetchMessagesWithoutReset: Finished, setting loading state to false');
      setIsLoading(false);
    }
  }, [isOffline, updateMessagesTimestamp, lastFetchTime, fetchState]);

  // Set up the fetchMessagesWithoutResetRef after the function is defined
  useEffect(() => {
    fetchMessagesWithoutResetRef.current = fetchMessagesWithoutReset;
  }, [fetchMessagesWithoutReset]);

  // Connect socket if user is logged in and socket is not already connected
  useEffect(() => {
    // Track connection attempts to prevent excessive reconnection loops
    const connectionAttemptKey = 'socket_connection_attempt_count';
    const connectionTimeKey = 'socket_last_connection_time';
    const maxConnectionAttempts = 3;
    const connectionCooldownMs = 30000; // 30 seconds
    
    // Skip if user isn't logged in or if socket is already connected
    if (!user || isConnected) {
      return;
    }
    
    // Check if we've had too many connection attempts recently
    const connectionAttempts = parseInt(sessionStorage.getItem(connectionAttemptKey) || '0');
    const lastConnectionTime = parseInt(sessionStorage.getItem(connectionTimeKey) || '0');
    const now = Date.now();
    
    // Reset connection attempts if enough time has passed
    if (now - lastConnectionTime > connectionCooldownMs) {
      sessionStorage.setItem(connectionAttemptKey, '0');
    } 
    // Prevent excessive reconnection attempts
    else if (connectionAttempts >= maxConnectionAttempts) {
      console.log(`⚡ Socket: Too many connection attempts (${connectionAttempts}), cooling down`);
      return;
    }
    
    // Update connection attempt count and time
    sessionStorage.setItem(connectionAttemptKey, (connectionAttempts + 1).toString());
    sessionStorage.setItem(connectionTimeKey, now.toString());
    
    console.log('⚡ Socket: Checking server status before connecting');
    
    try {
      // Define socket callbacks immediately to avoid duplicating code
      const socketCallbacks = {
        onConnect: () => {
          console.log('⚡ Socket: Connected successfully');
          setIsConnected(true);
          setConnectionError(null);
        },
        onConnectError: (error) => {
          console.error('⚡ Socket: Connection error:', error);
          setIsConnected(false);
          setConnectionError('Could not connect to server. Retrying...');
        },
        onDisconnect: (reason) => {
          console.log('⚡ Socket: Disconnected, reason:', reason);
          setIsConnected(false);
        },
        onAuthenticated: (data) => {
          console.log('⚡ Socket: Authentication successful:', data);
          // Fetch messages only if we haven't already fetched them recently
          const now = Date.now();
          const timeSinceLastFetch = now - lastFetchTime;
          const minTimeBetweenFetches = 5000; // 5 seconds
          
          if (timeSinceLastFetch > minTimeBetweenFetches && fetchState !== MESSAGE_FETCH_STATES.FETCHING) {
            console.log('⚡ Socket: Fetching messages after authentication');
            fetchMessagesWithoutReset();
          } else {
            console.log('⚡ Socket: Skipping message fetch after authentication - recent fetch already in progress');
          }
        },
        onAuthenticationFailed: (data) => {
          console.error('⚡ Socket: Authentication failed:', data);
          setConnectionError('Authentication failed. Please log in again.');
          // Clear token and redirect to login if authentication fails
          if (data && data.error === 'Invalid authentication token') {
            handleLogout();
          }
        },
        onWelcome: (data) => {
          console.log('⚡ Socket: Received welcome message:', data);
        },
        onNewMessage: (data) => {
          console.log('⚡ Socket: Received new message event:', data);
          // Don't add messages directly from broadcast
          // Messages will be fetched when refresh signal is received
        },
        onMessageAck: (data) => {
          console.log('⚡ Socket: Message acknowledgment received:', data);
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
                  console.log('⚡ Socket: Updating temporary message with server ID:', data.dbId);
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
          console.log('⚡ Socket: Processing refreshMessages signal - updating data');
          // Check if we can fetch messages based on timing and state
          const now = Date.now();
          const timeSinceLastFetch = now - lastFetchTime;
          const minTimeBetweenFetches = 10000; // 10 seconds
          
          if (fetchState !== MESSAGE_FETCH_STATES.FETCHING && timeSinceLastFetch > minTimeBetweenFetches) {
            console.log('⚡ Socket: Refreshing messages');
            if (fetchMessagesWithoutResetRef.current) {
              fetchMessagesWithoutResetRef.current();
            }
          } else {
            console.log('⚡ Socket: Skipping refresh - messages were fetched recently or fetch in progress');
            console.log(`  - Current fetch state: ${fetchState}`);
            console.log(`  - Time since last fetch: ${timeSinceLastFetch}ms`);
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
          console.log('⚡ Socket: Message deleted', data);
          
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
      
      // Simply connect to the socket - skip the status check which is failing
      if (user && user.username) {
        console.log('⚡ Socket: Connecting to socket with username:', user.username);
        socketService.connect(socketCallbacks, user.username);
        
        // Don't fetch messages here - we'll fetch them in the onAuthenticated callback if needed
      } else {
        console.error('⚡ Socket: Cannot connect - invalid user or missing username');
        setConnectionError('Cannot connect - invalid user or missing username');
      }
      
    } catch (error) {
      console.error('⚡ Socket: Error connecting to socket:', error);
      setConnectionError('Error connecting to server. Please try again later.');
      setIsConnected(false);
    }
    
    // Clean up function will be called when component unmounts or when user changes
    return () => {
      console.log('⚡ Socket: Cleaning up socket connection');
      socketService.disconnect();
    };
  }, [user, isConnected, fetchState, lastFetchTime, navigateToProfile]);
  
  // Periodically check server connection if in fallback mode
  useEffect(() => {
    if (!user || !socketService.isFallbackMode()) {
      return; // Only run this effect if logged in and in fallback mode
    }
    
    console.log('⚡ Socket: In fallback mode, setting up periodic server checks');
    
    // Check server every 30 seconds to see if it's back up
    const serverCheckInterval = setInterval(async () => {
      console.log('⚡ Socket: Fallback mode - checking if server is back up');
      
      try {
        const serverStatus = await socketService.checkServerStatus();
        
        if (serverStatus.success) {
          console.log('⚡ Socket: Server is now reachable, will exit fallback mode');
          clearInterval(serverCheckInterval);
          
          // Update the connection state (will trigger the main socket connection effect)
          setConnectionError(null);
          
          // Disable fallback mode
          socketService.disableFallbackMode();
        } else {
          console.log('⚡ Socket: Server still unreachable, staying in fallback mode');
        }
      } catch (error) {
        console.error('⚡ Socket: Error during fallback mode server check:', error);
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
      console.log('🔍 checkAuth: Starting authentication check');
      try {
        // Check if user is logged in using token from localStorage
        console.log('🔍 checkAuth: Calling authService.checkLoginStatus()');
        const userData = await authService.checkLoginStatus();
        
        console.log('🔍 checkAuth: Auth status result:', userData ? 'User is logged in' : 'No user data');
        
        if (userData) {
          // User is authenticated - no redirect from initial load
          console.log('🔍 checkAuth: About to call handleAuthSuccess with shouldRedirect=false');
          handleAuthSuccess(userData, false);
          console.log('🔍 checkAuth: After handleAuthSuccess call');
        } else {
          // User is not authenticated
          console.log('🔍 checkAuth: Setting user to null - not authenticated');
          setUser(null);
        }
      } catch (error) {
        // Error handling - just reset user state
        console.error('🔍 checkAuth: Error during authentication check:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔍 App: Running initial authentication check');
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
        console.log('🔍 App: Already fetching messages, ignoring request');
        return;
      }
      
      if (timeSinceLastFetch < minTimeBetweenFetches) {
        console.log(`🔍 App: Recently fetched messages (${timeSinceLastFetch}ms ago), will fetch after cooling period`);
        
        // Wait until the cooling period is over
        setTimeout(() => {
          try {
            fetchMessagesWithoutReset();
          } catch (error) {
            console.error('🔍 App: Error in delayed fetchMessagesWithoutReset:', error);
            // Set fetch state back to idle so future fetches can proceed
            setFetchState(MESSAGE_FETCH_STATES.IDLE);
            setIsLoading(false);
          }
        }, minTimeBetweenFetches - timeSinceLastFetch);
        
        return;
      }
      
      // If we get here, it's safe to fetch immediately
      fetchMessagesWithoutReset();
    } catch (error) {
      console.error('🔍 App: Error in handleRefreshMap:', error);
      // Set fetch state back to idle so future fetches can proceed
      setFetchState(MESSAGE_FETCH_STATES.IDLE);
      setIsLoading(false);
    }
  }, [lastFetchTime, fetchState, fetchMessagesWithoutReset]);

  // Get user location and set up auto-update
  useEffect(() => {
    // Define the function to get user location
    const getUserLocation = () => {
      console.log("Getting user location...");
      
      // Check if geolocation is available
      if (!navigator.geolocation) {
        console.log("Geolocation not supported by this browser");
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
          console.log("High accuracy position succeeded");
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            fuzzyLocation: false,
            error: null,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          console.log("Setting user location:", location);
          setUserLocation(location);
        },
        () => {
              console.log("High accuracy position failed, trying low accuracy...");
              // Try again with lower accuracy if high accuracy fails
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log("Low accuracy position succeeded");
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                fuzzyLocation: false,
                error: null,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              };
              console.log("Setting user location:", location);
              setUserLocation(location);
            },
            (err) => {
              console.log("Geolocation error:", err.message);
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
    
    // Get location immediately on app load
    getUserLocation();
    
    // Set up interval to refresh location
    const locationInterval = setInterval(() => {
      // Only update if the user is logged in
      if (user) {
        getUserLocation();
      }
    }, 300000); // Every 5 minutes (300000 ms)
    
    // Setup visibility change listener to request location when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("App in foreground, requesting location");
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
    console.log('🔐 handleAuthSuccess: Called with userData:', userData, 'shouldRedirect:', shouldRedirect);
    setUser(userData.user || userData); // Handle both cases: userData or userData.user
    
    // Set dark mode preference from user data if available
    const userObject = userData.user || userData;
    console.log('🔐 handleAuthSuccess: Setting user state with:', userObject);
    
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
      console.log('🔐 handleAuthSuccess: Scheduling message fetch after login');
      setTimeout(() => {
        console.log('🔐 handleAuthSuccess: Fetching messages after login');
        fetchMessagesWithoutReset(0, true); // Force refresh
      }, 1000); // 1 second delay
    } else {
      console.log('🔐 handleAuthSuccess: Skipping message fetch - already initiated or recent fetch in progress');
      console.log(`  - Fetch initiated: ${fetchInitiated ? 'Yes' : 'No'}`);
      console.log(`  - Current fetch state: ${fetchState}`);
      console.log(`  - Time since last fetch: ${timeSinceLastFetch}ms`);
    }
    
    // Clear the fetch initiated flag when the page is refreshed or closed
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('fetchMessagesInitiated');
    });
    
    // Redirect if requested (typically on explicit login vs token-based auth)
    if (shouldRedirect) {
      console.log('🔐 handleAuthSuccess: Redirecting to home page');
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
    try {
      const response = await authService.updateProfile({ darkMode });
      if (!response.success) {
        console.error('Failed to update dark mode preference');
      }
    } catch (error) {
      console.error('Error updating dark mode preference:', error);
    }
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
    setNotifications(prev => []);
  };

  // Periodically refresh messages when the user is logged in
  useEffect(() => {
    // Skip if user is not logged in
    if (!user) {
      console.log('🔄 Periodic refresh: User not logged in, skipping message refresh setup');
      return;
    }
    
    console.log('🔄 Periodic refresh: Setting up periodic message refresh');
    
    // Set up interval to refresh messages every minute
    const messageRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh: Refreshing messages');
      fetchMessagesWithoutReset();
    }, 60000); // Every 60 seconds
    
    // Clean up interval on component unmount or when user changes
    return () => {
      console.log('🔄 Periodic refresh: Cleaning up message refresh interval');
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
      console.error('Cannot send message while disconnected');
      return { error: 'Cannot send message while disconnected' };
    }
    
    if (!user) {
      console.error('Cannot send message while not logged in');
      return { error: 'Cannot send message while not logged in' };
    }

    // Check if user can send a message (30 minutes since last message)
    if (!canUserSendMessage()) {
      console.log('User attempted to send message before 30-minute cooldown period');
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
      console.log('Using fallback location:', messageLocation);
    } else if (messageLocation.fuzzyLocation) {
      // Only vary locations that are already fuzzy
      messageLocation = createVariedLocation(messageLocation);
      console.log('Using varied location:', messageLocation);
    } else {
      // Apply fuzzy location if requested
      messageLocation = createFuzzyLocation(messageLocation, useFuzzyLocation);
      console.log(useFuzzyLocation ? 'Using fuzzy location for privacy:' : 'Using exact location:', messageLocation);
    }

    // If formData is provided, send with image upload
    if (formData) {
      try {
        console.log('Sending message with image via API');
        // Send the message with image via API
        const response = await apiService.sendMessageWithImage(message, formData, messageLocation);
        
        if (response.success) {
          console.log('Message with image sent successfully:', response);
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
      } catch (error) {
        console.error('Error sending message with image:', error);
        // Add a local error message
        addMessage('Error', 'Failed to send your message with image. Please try again.', true, currentTimestamp);
      }
    } else {
      // Handle regular text-only messages
      try {
        // Add our message locally with a temporary ID first for immediate feedback
        addMessage(user.username, message, false, currentTimestamp, messageLocation);
        
        // Enhanced logging for debugging
        console.log('🔄 DEBUG - User object:', JSON.stringify(user, null, 2));
        console.log('🔄 DEBUG - User username:', user.username);
        console.log('🔄 DEBUG - Message to send:', message);
        console.log('🔄 DEBUG - Message location:', JSON.stringify(messageLocation, null, 2));
        
        // Log the username we're using
        console.log('🔄 Sending message via socket as user:', user.username);
        
        // Use socket to send message, ensuring consistency with bots client
        socketService.sendMessage(message, user.username, messageLocation);
        
        // We don't need to do anything else here - the server will broadcast
        // the message to all clients and trigger a refresh event
      } catch (error) {
        console.error('Error sending message via socket:', error);
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
            .catch(err => {
              console.error('Error requesting notification permission:', err);
            });
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
    console.log('🔎 Rendering Auth/Landing screen because user is null');
    return (
      <Router>
        <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
          {/* Show PWA install prompt */}
          <PWAInstallPrompt isDarkMode={isDarkMode} />
          
          {/* Show landing page or auth component based on route */}
          <Routes>
            <Route path="/" element={<LandingPage isDarkMode={isDarkMode} />} />
            <Route path="/auth/*" element={<Auth onAuthSuccess={(userData) => {
              console.log('🔐 Auth component calling handleAuthSuccess with shouldRedirect=true');
              handleAuthSuccess(userData, true);
            }} isDarkMode={isDarkMode} />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // Main app content
  console.log('🔎 Rendering main AppContent because user exists:', user?.username);
  return (
    <Router>
      <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
        {user ? (
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
        ) : (
          <Auth 
            onAuthSuccess={handleAuthSuccess} 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        )}
      </div>
    </Router>
  );
}

export default App;