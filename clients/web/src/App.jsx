import { useState, useEffect, useContext } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notifications, setNotifications] = useState([])

  // Define state for messages timestamp (used for refreshing)
  const [, setMessagesTimestamp] = useState(Date.now())
  
  // Add context
  const { isOffline } = useContext(AppContext);
  
  // Function to navigate to profiles when receiving notifications
  const navigateToProfile = (username) => {
    window.location.href = `/profile/${username}`;
  };

  // Check for authentication on initial load
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      console.log('🔍 checkAuth: Starting authentication check');
      setIsLoading(true);
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
  useEffect(() => {
    const fetchMessagesHandler = () => {
      console.log('🔍 App: Received fetchMessages request from MapView');
      fetchMessagesWithoutReset();
    };
    
    // Add event listener
    window.addEventListener('map:fetchMessages', fetchMessagesHandler);
    
    // Clean up
    return () => {
      window.removeEventListener('map:fetchMessages', fetchMessagesHandler);
    };
  }, []);  // Empty dependency array means this runs once on mount
  
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

  useEffect(() => {
    // Define socket callbacks
    const socketCallbacks = {
      onConnect: () => {
        setIsConnected(true);
        setConnectionError(null);
      },
      onConnectError: () => {
        setIsConnected(false);
        setConnectionError('Could not connect to server. Retrying...');
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onWelcome: () => {
        // Handle welcome data if needed
      },
      onNewMessage: () => {
        // Don't add messages directly from broadcast anymore
        // Messages will be fetched from the database when refresh signal is received
      },
      onRefreshMessages: () => {
        console.log('⚡ Socket: Processing refreshMessages signal - updating messages timestamp to refresh data');
        // Invalidate our cache to force a refetch when user next views messages
        fetchMessagesWithoutReset();
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
            updateMessagesTimestamp();
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
            updateMessagesTimestamp();
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
          updateMessagesTimestamp();
        }
      },
      onNotificationClick: (data) => {
        // Handle notification click by navigating to the relevant page
        if (data.sender) {
          navigateToProfile(data.sender);
        }
      }
    };
    
    // Connect socket if user is logged in
    if (user) {
      socketService.connect(socketCallbacks, user.username);
    } else {
      // If not logged in, disconnect
      socketService.disconnect();
    }
    
    return () => {
      // Clean up on unmount
      socketService.disconnect();
    };
  }, [user]);
  
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

  // Add message handling for both text-only and image messages
  const handleShareUpdate = async (message, formData = null) => {
    if (!isConnected) {
      console.log('Not connected to socket, cannot share update');
      return;
    }

    // Get current timestamp
    const currentTimestamp = new Date();
    
    // Get fuzzy location preference from formData if available
    let useFuzzyLocation = true; // Default to true for privacy
    if (formData && formData.get('fuzzyLocation')) {
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
      // Add our message locally with a temporary ID
      // This gives immediate feedback to the user but will be replaced by DB version on refresh
      addMessage(user.username, message, false, currentTimestamp, messageLocation);
      
      // Send the message to the server via Socket.IO
      // The server will save it to the database and broadcast to other clients
      socketService.sendMessage(message, user.username, messageLocation);
    }
    
    // Messages will be refreshed from the database when the refreshMessages event is received
    // This ensures all clients have consistent data from a single source (the database)
  };

  // Update the addMessage function to include image support
  const addMessage = (sender, content, isReceived, timestamp = new Date(), location = null, messageId = null, image = null) => {
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
  };

  // Helper to update messages timestamp 
  const updateMessagesTimestamp = () => {
    setMessagesTimestamp(Date.now());
  };

  // Fetch messages function that doesn't reset view
  const fetchMessagesWithoutReset = async (retryCount = 0) => {
    // Skip if offline
    if (isOffline) {
      console.log('🔄 fetchMessagesWithoutReset: Offline, skipping message fetch');
      return;
    }
    
    console.log('🔄 fetchMessagesWithoutReset: Starting to fetch messages');
    
    try {
      setIsLoading(true);
      console.log('🔄 fetchMessagesWithoutReset: Set loading state to true');
      
      console.log('🔄 fetchMessagesWithoutReset: About to call apiService.getMessages()');
      const response = await apiService.getMessages();
      console.log('🔄 fetchMessagesWithoutReset: Response received:', response);
      
      if (response && response.success) {
        console.log('🔄 fetchMessagesWithoutReset: Response was successful');
        
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
          
          // Replace messages with new filtered formatted data
          console.log('🔄 fetchMessagesWithoutReset: Setting messages state with filtered data');
          setMessages(recentMessages);
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
        
        // If error response and we haven't retried too many times, try again
        if (retryCount < 2) {
          console.log(`🔄 fetchMessagesWithoutReset: Retrying after error (attempt ${retryCount + 1})`);
          setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 1000);
          return;
        }
      }
    } catch (error) {
      console.error('🔄 fetchMessagesWithoutReset: Error fetching messages:', error);
      
      // If error and we haven't retried too many times, try again
      if (retryCount < 2) {
        console.log(`🔄 fetchMessagesWithoutReset: Retrying after exception (attempt ${retryCount + 1})`);
        setTimeout(() => fetchMessagesWithoutReset(retryCount + 1), 1000);
        return;
      }
    } finally {
      console.log('🔄 fetchMessagesWithoutReset: Finished, setting loading state to false');
      setIsLoading(false);
    }
  };

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
    
    // Explicitly fetch messages after successful authentication
    console.log('🔐 handleAuthSuccess: Fetching messages after authentication');
    setTimeout(() => {
      // Use setTimeout to ensure user state is set before fetching messages
      fetchMessagesWithoutReset();
    }, 500);
    
    // Force navigation to the home page after successful login, only if called from login form
    if (shouldRedirect) {
      console.log('🔐 handleAuthSuccess: shouldRedirect is true, navigating to homepage');
      window.location.href = '/';
          } else {
      console.log('🔐 handleAuthSuccess: shouldRedirect is false, not redirecting');
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
    setNotifications([]);
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

  // If offline, show the offline fallback
  if (isOffline) {
    return <OfflineFallback messages={messages} isDarkMode={isDarkMode} />;
  }

  // If not logged in and not loading, show the auth screen
  if (!user && !isLoading) {
    console.log('🔎 Rendering Auth/Landing screen because user is null and not loading');
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
          <AppContent
            user={user}
            onlineUsers={onlineUsers}
            messages={messages}
            handleSocketMessage={handleShareUpdate}
            isConnected={isConnected}
            connectionError={connectionError}
            handleLogout={handleLogout}
            userLocation={userLocation}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            notifications={notifications}
            onClearNotifications={handleClearNotifications}
            isLoading={isLoading}
          />
    </Router>
  );
}

export default App;