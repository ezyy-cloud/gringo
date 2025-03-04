import { useState, useEffect, useContext, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { GoChevronLeft, GoKebabHorizontal, GoPerson, GoSun, GoMoon, GoSignOut } from "react-icons/go"
import PropTypes from 'prop-types'
import socketService from './services/socketService'
import apiService from './services/apiService'
import authService from './services/authService'
import MapView from './components/MapView'
import FloatingActionButton from './components/FloatingActionButton'
import MessageModal from './components/MessageModal'
import Auth from './components/auth/Auth'
import ProfilePage from './components/profile/ProfilePage'
import NotificationBell from './components/NotificationBell'
import OfflineFallback from './components/OfflineFallback'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import LandingPage from './components/LandingPage'
import { AppContext } from './context/AppContext'
import './App.css'

// Navigation header with back button component
const NavigationHeader = ({ onLogout, isDarkMode, toggleDarkMode, notifications, onClearNotifications }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Show back button on routes other than home
  const showBackButton = location.pathname !== '/';
  
  // Determine the page title based on the current route
  const getPageTitle = () => {
    if (location.pathname.startsWith('/profile')) {
      return 'Profile';
    }
    return 'Gringo';
  };
  
  // Handle dropdown toggle
  const toggleDropdown = () => {
    document.getElementById('dropdown-menu').classList.toggle('show');
  };

  // Handle closing the dropdown
  const closeDropdown = () => {
    const dropdown = document.getElementById('dropdown-menu');
    if (dropdown?.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  };

  // Close the dropdown when clicking elsewhere on the page
  useEffect(() => {
    const handleClickOutside = (event) => {
      const menuContainer = document.querySelector('.menu-container');
      if (menuContainer && !menuContainer.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Handler for menu item click
  const handleMenuItemClick = (action) => {
    // Close the dropdown first
    closeDropdown();
    
    // Perform the action (navigate or logout)
    if (action === 'profile') {
      navigate('/profile');
    } else if (action === 'logout') {
      onLogout();
    } else if (action === 'toggleDarkMode') {
      toggleDarkMode();
    }
  };
  
  return (
    <header className="app-header">
      {showBackButton && (
        <button className="back-button" onClick={() => navigate(-1)}>
          <GoChevronLeft />
        </button>
      )}
      <h1>{getPageTitle()}</h1>
      
      <div className="header-actions">
        {/* Only show NotificationBell if we have notifications prop */}
        {notifications && (
          <NotificationBell 
            notifications={notifications} 
            onClearNotifications={onClearNotifications}
            isDarkMode={isDarkMode} 
          />
        )}
        
        <div className="menu-container">
          <button className="menu-button" onClick={(e) => {
            e.stopPropagation(); // Prevent immediate close by document click handler
            toggleDropdown();
          }}>
            <GoKebabHorizontal className="menu-dots" />
          </button>
          <div id="dropdown-menu" className="dropdown-menu">
            <button onClick={() => handleMenuItemClick('profile')} className="dropdown-item">
              <span className="dropdown-icon"><GoPerson /></span> Profile
            </button>
            <button onClick={() => handleMenuItemClick('logout')} className="dropdown-item">
              <span className="dropdown-icon"><GoSignOut /></span> Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Add PropTypes validation for NavigationHeader
NavigationHeader.propTypes = {
  onLogout: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
  notifications: PropTypes.array,
  onClearNotifications: PropTypes.func
};

// Component that combines navigation and routes
const AppContent = ({ 
  user, 
  onlineUsers, 
  messages, 
  handleSocketMessage,
  isConnected,
  connectionError,
  handleLogout,
  userLocation,
  isDarkMode,
  toggleDarkMode,
  notifications,
  onClearNotifications
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdownModalOpen, setCountdownModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);

  const closeModal = () => setIsModalOpen(false);
  
  const closeCountdownModal = () => {
    setCountdownModalOpen(false);
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
  };

  // Check if user can share an update (last update was more than 30 minutes ago)
  const canUserShareUpdate = () => {
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
  const getTimeRemaining = () => {
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

  // Format milliseconds to minutes and seconds
  const formatTimeRemaining = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const openModal = () => {
    if (canUserShareUpdate()) {
      setIsModalOpen(true);
    } else {
      // Calculate initial time remaining
      const initialTimeRemaining = getTimeRemaining();
      setTimeRemaining(initialTimeRemaining);
      
      // Open countdown modal
      setCountdownModalOpen(true);
      
      // Setup interval to update countdown
      const interval = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = Math.max(0, prevTime - 1000);
          
          // If countdown reaches zero, clear interval and allow posting
          if (newTime <= 0) {
            clearInterval(interval);
            setCountdownModalOpen(false);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
      
      // Store interval ID for cleanup
      setCountdownInterval(interval);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <NavigationHeader 
        onLogout={handleLogout} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        notifications={notifications}
        onClearNotifications={onClearNotifications}
      />
      
      {connectionError && <div className="connection-error">{connectionError}</div>}
      
      <Routes>
        <Route path="/profile" element={<ProfilePage user={user} onlineUsers={onlineUsers} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/profile/:username" element={<ProfilePage onlineUsers={onlineUsers} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/" element={
          <>
            <main className="app-main">
              <div className="tab-content">
                <MapView 
                  messages={messages} 
                  currentUsername={user ? user.username : null} 
                  onlineUsers={onlineUsers}
                  userLocation={userLocation}
                  isDarkMode={isDarkMode}
                />
              </div>
            </main>

            {/* Floating Action Button for sharing updates */}
            <FloatingActionButton onClick={openModal} isDarkMode={isDarkMode} />
            
            {/* Update Modal */}
            <MessageModal 
              isOpen={isModalOpen} 
              onClose={closeModal} 
              onShareUpdate={handleSocketMessage}
              disabled={!isConnected || !user}
              placeholder="What's happening around?"
              isDarkMode={isDarkMode}
            />
            
            {/* Countdown Modal */}
            {countdownModalOpen && (
              <div className="message-modal-overlay" onClick={closeCountdownModal}>
                <div className={`message-modal ${isDarkMode ? 'dark-mode' : ''}`} onClick={e => e.stopPropagation()}>
                  <div className="message-modal-header">
                    <h3>Please Wait</h3>
                    <button className="close-button" onClick={closeCountdownModal}>×</button>
                  </div>
                  <div className="message-modal-form" style={{ padding: '20px', textAlign: 'center' }}>
                    <p>You can only share an update once every 30 minutes.</p>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      margin: '20px 0',
                      color: isDarkMode ? 'var(--dark-text)' : 'var(--text-color)'
                    }}>
                      {formatTimeRemaining(timeRemaining)}
                    </div>
                    <p>Time remaining before you can share another update.</p>
                  </div>
                  <div className="message-modal-footer">
                    <button 
                      type="button" 
                      className="cancel-button"
                      onClick={closeCountdownModal}
                      style={{ margin: '0 auto' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        } />
      </Routes>
    </div>
  );
};

// Add PropTypes validation for AppContent
AppContent.propTypes = {
  user: PropTypes.object,
  onlineUsers: PropTypes.object,
  messages: PropTypes.array,
  handleSocketMessage: PropTypes.func.isRequired,
  isConnected: PropTypes.bool,
  connectionError: PropTypes.string,
  handleLogout: PropTypes.func.isRequired,
  userLocation: PropTypes.object,
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
  notifications: PropTypes.array,
  onClearNotifications: PropTypes.func
};

// Extract nested function to reduce nesting depth
const createFallbackLocation = (messagesArray) => {
  // First, try to use recent message locations if available
  const recentMessages = messagesArray || [];
  const messagesWithLocation = recentMessages.filter(msg => 
    msg.location && !msg.location.error && 
    msg.location.latitude && msg.location.longitude
  );
  
  if (messagesWithLocation.length > 0) {
    // Use the most recent message location with a small random variation
    const lastMsg = messagesWithLocation[messagesWithLocation.length - 1];
    const latVariation = (Math.random() - 0.5) * 0.01; // Small variation (~1km)
    const lngVariation = (Math.random() - 0.5) * 0.01;
    
    return {
      latitude: lastMsg.location.latitude + latVariation,
      longitude: lastMsg.location.longitude + lngVariation,
      isFallback: true
    };
  }
  
  // Default fallback to NYC if no better data is available
  const randomLat = 40.730610 + (Math.random() - 0.5) * 0.1;
  const randomLng = -73.935242 + (Math.random() - 0.5) * 0.1;
  return { 
    latitude: randomLat, 
    longitude: randomLng,
    isFallback: true 
  };
};

// Create a slightly varied location (within ~500m)
const createVariedLocation = (baseLocation) => {
  // Create a slightly varied location (within ~500m)
  const latVariation = (Math.random() - 0.5) * 0.005;
  const lngVariation = (Math.random() - 0.5) * 0.005;
  
  return {
    latitude: baseLocation.latitude + latVariation,
    longitude: baseLocation.longitude + lngVariation,
    isFallback: true
  };
};

// Create fuzzy location based on privacy settings
const createFuzzyLocation = (baseLocation, useFuzzyLocation = true) => {
  if (!baseLocation) return null;
  
  // If fuzzy location is not requested, return the exact location
  if (!useFuzzyLocation) {
    return {
      latitude: baseLocation.latitude,
      longitude: baseLocation.longitude,
      isFallback: baseLocation.isFallback
    };
  }
  
  // For privacy, add a random offset (between 100m-500m)
  // More random offset than standard varied location
  const latVariation = (Math.random() - 0.5) * 0.01; // Roughly 0.5-1km variation
  const lngVariation = (Math.random() - 0.5) * 0.01;
  
  return {
    latitude: baseLocation.latitude + latVariation,
    longitude: baseLocation.longitude + lngVariation,
    isFallback: true // Mark as not exact location
  };
};

// Function to properly handle geolocation success
const handleGeolocationSuccess = (position, setLocationFunction) => {
  if (!position || !position.coords) {
    
    return;
  }
  
  const { latitude, longitude } = position.coords;
  
  // Use the exact coordinates from the browser's geolocation API
  // The isFallback flag is set to false because this is the actual user location
  setLocationFunction({
    latitude,
    longitude,
    isFallback: false // This is real location data, not a fallback
  });
};

// Extract function for handling location fallback to reduce nesting
const handleLocationFallback = (prevLocation) => {
  if (!prevLocation) {
    return createFallbackLocation([]);
  }
  return prevLocation;
};

// Extract function to filter old messages to reduce nesting
const filterOldMessages = (messages, timeThreshold) => {
  const newMessages = messages.filter(msg => {
    const msgDate = new Date(msg.timestamp);
    return msgDate >= timeThreshold;
  });
  
  // Log if any messages were removed
  const removedCount = messages.length - newMessages.length;
  if (removedCount > 0) {
    
  }
  
  return newMessages;
};

// Helper function to create a notification from socket data
const createNotification = (data) => {
  // Skip system messages
  if (data.sender === 'System' || data.sender === 'Server') {
    
    return null; // Return null to indicate no notification was created
  }
  
  return {
    id: Date.now(),
    sender: data.sender,
    preview: data.messagePreview,
    timestamp: data.timestamp,
    read: false
  };
};

// Function to check if the device is iOS (iPhone, iPad, iPod)
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Add state for notification management
  const [notifications, setNotifications] = useState([]);
  
  // Get messagesTimestamp from context
  const { messagesTimestamp, setMessagesTimestamp } = useContext(AppContext);
  
  // Function to navigate to profiles when receiving notifications
  const navigateToProfile = (username) => {
    window.location.href = `/profile/${username}`;
  };

  // Initialize on component mount
  useEffect(() => {
    // Check if user is already logged in from localStorage
    const checkAuth = async () => {
      try {
        const userData = await authService.checkLoginStatus();
        if (userData) {
          setUser(userData);
          // Set dark mode from user preferences if available
          if (userData.darkMode !== undefined) {
            setIsDarkMode(userData.darkMode);
            localStorage.setItem('darkMode', userData.darkMode.toString());
          }
        }
      } catch (error) {  // Using underscore indicates it's intentionally unused
        
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Check if dark mode preference was saved
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }

    checkAuth();
    
    // Function to get user's location
    const getUserLocation = () => {
      console.log("Attempting to get user location");
      
      if (navigator.geolocation) {
        console.log("Geolocation is supported");
        
        const geoOptions = {
          enableHighAccuracy: true,
          timeout: isIOS() ? 30000 : 20000, // Increased timeout for both platforms
          maximumAge: 30000 // Allow cached positions up to 30 seconds old
        };

        const fallbackGeoOptions = {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000 // Allow cached positions up to 1 minute old
        };
        
        console.log("Device is iOS:", isIOS());
        console.log("Using geolocation options:", geoOptions);

        if (isIOS()) {
          // iOS-specific implementation
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("getCurrentPosition succeeded");
              handleGeolocationSuccess(position, setUserLocation);
            },
            (error) => {
              console.log("High accuracy position failed, trying low accuracy...");
              // Try again with lower accuracy if high accuracy fails
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log("Low accuracy position succeeded");
                  handleGeolocationSuccess(position, setUserLocation);
                },
                (error) => {
                  console.error("getCurrentPosition error:", error);
                  setUserLocation(prevLocation => handleLocationFallback(prevLocation));
                },
                fallbackGeoOptions
              );
            },
            geoOptions
          );
        } else {
          // Non-iOS devices - use same two-step approach
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("getCurrentPosition succeeded");
              handleGeolocationSuccess(position, setUserLocation);
            },
            (error) => {
              console.log("High accuracy position failed, trying low accuracy...");
              // Try again with lower accuracy if high accuracy fails
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log("Low accuracy position succeeded");
                  handleGeolocationSuccess(position, setUserLocation);
                },
                (error) => {
                  console.error("getCurrentPosition error:", error);
                  setUserLocation(prevLocation => handleLocationFallback(prevLocation));
                },
                fallbackGeoOptions
              );
            },
            geoOptions
          );
        }
      } else {
        console.warn("Geolocation is NOT supported by this browser");
        // Browser doesn't support geolocation, use fallback
        setUserLocation(prevLocation => handleLocationFallback(prevLocation));
      }
    };

    // Get location initially
    getUserLocation();
    
    // Update location on different intervals based on device type
    // iOS devices need more frequent attempts to ensure permissions are accepted
    const intervalTime = isIOS() ? 1 * 60 * 1000 : 2 * 60 * 1000; // 1 min for iOS, 2 mins for others
    const locationInterval = setInterval(getUserLocation, intervalTime);
    
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
  }, []); // Empty dependency array means this runs only once on mount

  useEffect(() => {
    
    
    // Define socket callbacks
    const socketCallbacks = {
      onConnect: () => {
        
        setIsConnected(true);
        setConnectionError(null);
      },
      onConnectError: (error) => {
        
        setIsConnected(false);
        setConnectionError('Could not connect to server. Retrying...');
      },
      onDisconnect: () => {
        
        setIsConnected(false);
      },
      onWelcome: (data) => {
        
      },
      onNewMessage: (data) => {
        
        // Don't add messages directly from broadcast anymore
        // Messages will be fetched from the database when refresh signal is received
      },
      onRefreshMessages: () => {
        console.log('⚡ Socket: Processing refreshMessages signal - updating messages timestamp to refresh data');
        // Invalidate our cache to force a refetch when user next views messages
        setMessagesTimestamp(Date.now());
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
            .catch(error => {
              
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
    } else if (messageLocation.isFallback) {
      // Only vary fallback locations, not real user locations
      messageLocation = createVariedLocation(messageLocation);
      console.log('Using varied fallback location:', messageLocation);
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
      // Create a temporary local ID for this message (until we get DB confirmation)
      const tempLocalId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      return; // Don't add system messages to the messages list
    }
    
    // Only filter non-system messages for the 30-minute window
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (new Date(timestamp) < thirtyMinutesAgo) {
      console.log('Message is older than 30 minutes, not adding to state');
      return; // Don't add old messages
    }
    
    setMessages(prev => [...prev, { 
      sender, 
      content, 
      isReceived, 
      timestamp, 
      location,
      messageId,
      image
    }]);
  };
  
  // Fetch messages from the database
  useEffect(() => {
    if (user) {
      console.log('⚡ Fetching messages from database due to messagesTimestamp update');
      // Fetch all messages, excluding the current user's messages (we don't want duplicates)
      apiService.getAllMessages(null, user.username)
        .then(response => {
          if (response.messages && Array.isArray(response.messages)) {
            
            
            // Convert DB messages to app message format and add them to state
            const formattedMessages = response.messages.map(msg => ({
              sender: msg.senderUsername,
              content: msg.text,
              isReceived: true, // These are received messages from the database
              timestamp: new Date(msg.createdAt),
              location: msg.location,
              dbId: msg._id,
              likesCount: msg.likes ? msg.likes.length : 0,
              likedByCurrentUser: msg.likedByCurrentUser || false,
              image: msg.image
            }));
            
            // Only use messages from the last 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const recentMessages = formattedMessages.filter(msg => 
              msg.timestamp >= thirtyMinutesAgo
            );
            
            
            
            // Check for duplicates before adding to state
            setMessages(prevMessages => {
              // Create a set of existing message IDs
              const existingMessageIds = new Set(
                prevMessages
                  .filter(msg => msg.dbId)
                  .map(msg => msg.dbId)
              );
              
              // Filter out any messages that already exist in state
              const newMessages = recentMessages.filter(msg => 
                !msg.dbId || !existingMessageIds.has(msg.dbId)
              );
              
              
              
              // Combine existing messages with new ones
              return [...prevMessages, ...newMessages];
            });
          }
        })
        .catch(error => {
          
        });
    }
  }, [user, messagesTimestamp]);

  // Update messages with liked status when user or messages change
  useEffect(() => {
    // Only run if we have a user and messages
    if (user && messages.length > 0) {
      // Get the user's liked messages
      apiService.getUserByUsername(user.username)
        .then(response => {
          if (response.success && response.user && response.user.likedMessages) {
            const likedMessageIds = response.user.likedMessages;
            
            // Update messages with liked status
            setMessages(prevMessages => 
              prevMessages.map(message => ({
                ...message,
                likedByCurrentUser: message.dbId && likedMessageIds.includes(message.dbId)
              }))
            );
          }
        })
        .catch(error => {
          
        });
    }
  }, [user, messages.length]);

  // Handle sending a message 
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    // Set dark mode from user preferences if available
    if (userData.darkMode !== undefined) {
      setIsDarkMode(userData.darkMode);
      localStorage.setItem('darkMode', userData.darkMode.toString());
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setMessages([]);
    socketService.disconnect();
    setIsConnected(false);
  };

  // Add an effect to periodically check for and remove old messages
  useEffect(() => {
    // Only run this if there are messages and user is authenticated
    if (messages.length > 0 && user) {
      // Set up interval to check every minute
      const interval = setInterval(() => {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // Filter out messages older than 30 minutes
        setMessages(prev => filterOldMessages(prev, thirtyMinutesAgo));
      }, 60000); // Check every minute
      
      // Clean up interval on unmount
      return () => clearInterval(interval);
    }
  }, [messages.length, user]);

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // If user is logged in, sync dark mode preference with server
    if (user) {
      updateUserDarkModePreference(newDarkMode);
    }
  };
  
  // Function to update user's dark mode preference on the server
  const updateUserDarkModePreference = async (darkMode) => {
    try {
      const response = await authService.updateProfile({ darkMode });
      if (!response.success) {
        
      }
    } catch (error) {
      
    }
  };
  
  // Load dark mode preference from localStorage on initial render
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  // Apply dark mode class to body element when isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Clear all notifications
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Render loading state when loading
  if (isLoading) {
    return <div className={`loading ${isDarkMode ? 'dark-mode' : ''}`}>Loading...</div>
  }

  // For both authenticated and non-authenticated users, use Router
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
        <OfflineFallback />
        <PWAInstallPrompt />
        
        {user ? (
          // Authenticated user content
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
          />
        ) : (
          // Non-authenticated user - routing for landing and auth pages
          <Routes>
            <Route path="/auth" element={
              <Auth onAuthSuccess={handleAuthSuccess} isDarkMode={isDarkMode} />
            } />
            <Route path="/" element={
              <LandingPage isDarkMode={isDarkMode} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  )
}

export default App
