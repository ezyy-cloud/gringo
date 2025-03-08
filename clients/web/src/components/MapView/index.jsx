import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactMapGL, { Marker, Popup, Source, Layer } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import { GoHeart, GoHeartFill, GoLocation, GoHome, GoStack } from "react-icons/go";
import AvatarPlaceholder from '../AvatarPlaceholder';
import WeatherWidget from '../WeatherWidget';
import { timeAgo } from '../../utils/dateUtils';
import { renderTextWithLinks } from '../../utils/textUtils.jsx';
import apiService from '../../services/apiService';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles.css';
import '../MapView3D/styles.css';

const MapView = ({ messages, currentUsername, onlineUsers, userLocation, isDarkMode, isLoading }) => {
  // Debug log for received messages
  console.log(`🗺️ MapView: Received ${messages?.length || 0} messages`);
  console.log('🗺️ MapView: Current userLocation:', userLocation);

  const [viewState, setViewState] = useState({
    longitude: -73.935242,  // Default to NYC coordinates
    latitude: 40.730610,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedMessagesCache, setLikedMessagesCache] = useState(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const mapRef = useRef();
  const navigate = useNavigate();
  const likeButtonRef = useRef(null);
  // Add a ref to track if initial position has been set
  const hasSetInitialPosition = useRef(false);
  // Add a ref to store the previous messages count to detect refreshes
  const prevMessagesCountRef = useRef(0);

  // Add a custom useEffect to fetch messages when the map component mounts
  useEffect(() => {
    console.log('🗺️ MapView: Component mounted, dispatching custom event to fetch messages');
    // Dispatch a custom event to notify App component to fetch messages
    const fetchMessagesEvent = new CustomEvent('map:fetchMessages');
    window.dispatchEvent(fetchMessagesEvent);
  }, []);

  // Handle navigation to user profile
  const navigateToProfile = (username, e) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
    setSelectedMessage(null); // Close popup after navigation
  };

  // Toggle 3D mode with loading state
  const toggle3DMode = useCallback(() => {
    if (!is3DMode) {
      // When turning on 3D mode, set loading state first
      setIs3DLoaded(false);
      
      // Then enable 3D mode
      setIs3DMode(true);
      
      // Set appropriate pitch for 3D view - this tilts the map to show buildings better
      setViewState(prev => ({
        ...prev,
        pitch: 45, // Tilt the map for 3D view
        zoom: Math.max(prev.zoom, 15) // Ensure we're zoomed in enough to see buildings
      }));
      
      // Show hint message after 3D mode is loaded
      setTimeout(() => {
        setIs3DLoaded(true);
        // Show hint message briefly
        setShowHint(true);
        // Hide it after 5 seconds
        setTimeout(() => {
          setShowHint(false);
        }, 5000);
      }, 1000);
    } else {
      // When turning off, reset the pitch and disable 3D
      setViewState(prev => ({
        ...prev,
        pitch: 0, // Reset tilt
      }));
      
      // Disable 3D mode
      setIs3DMode(false);
      setIs3DLoaded(false);
      setShowHint(false);
    }
  }, [is3DMode]);

  // Cache user's liked messages
  useEffect(() => {
    if (currentUsername && !likedMessagesCache) {
      apiService.getUserByUsername(currentUsername)
        .then(response => {
          if (response.success && response.data && response.data.user && response.data.user.likedMessages) {
            setLikedMessagesCache(response.data.user.likedMessages);
          } else {
            if (response.success) {
              setLikedMessagesCache([]);
            }
          }
        })
        .catch(error => {
          setLikedMessagesCache([]);
        });
    }
  }, [currentUsername, likedMessagesCache]);

  // Track changes to likedMessagesCache
  useEffect(() => {
    // Debug statements removed
  }, [likedMessagesCache, currentUsername]);

  // Check if a message is liked using cache when possible
  const isMessageLiked = useCallback((messageId) => {
    if (!messageId || !likedMessagesCache) return false;
    
    // Convert both to strings to ensure consistent comparison
    const messageIdStr = messageId.toString();
    return likedMessagesCache.some(id => id.toString() === messageIdStr);
  }, [likedMessagesCache]);

  // Handle marking a message when selected
  const onSelectMessage = (e, message) => {
    e.originalEvent.stopPropagation();
    
    // If we have the cache, use it instead of making an API call
    if (likedMessagesCache && message.dbId) {
      const isLiked = isMessageLiked(message.dbId);
      const updatedMessage = {
        ...message,
        likedByCurrentUser: isLiked
      };
      
      setSelectedMessage(updatedMessage);
      setIsLiked(isLiked);
      setLikesCount(message.likesCount || 0);
      
      if (likedMessagesCache && likedMessagesCache.length > 0) {
        // Check if message exists in liked messages
      }
    } 
    // If message already has the like status, use it
    else if (message.hasOwnProperty('likedByCurrentUser')) {
      setSelectedMessage(message);
      setIsLiked(message.likedByCurrentUser);
      setLikesCount(message.likesCount || 0);
      
      // Log the selected message's like status
    } 
    // Otherwise fetch from API
    else if (currentUsername && message.dbId) {
      
      apiService.getUserByUsername(currentUsername)
        .then(response => {
          // Log the raw response for debugging
          
          // Fixed: Access the correct response structure (response.data.user)
          if (response.success && response.data && response.data.user && response.data.user.likedMessages) {
            const messageIdStr = message.dbId.toString();
            const isLiked = response.data.user.likedMessages.some(id => id.toString() === messageIdStr);
            
            setSelectedMessage({
              ...message,
              likedByCurrentUser: isLiked
            });
            setIsLiked(isLiked);
            setLikesCount(message.likesCount || 0);
            
            // Log the selected message's like status after API check with IDs
          } else {
            setSelectedMessage(message);
            setIsLiked(false);
            setLikesCount(message.likesCount || 0);
            
            // Log the selected message's like status (default to false if API doesn't return expected data)
          }
        })
        .catch(error => {
          console.error('Error checking if message is liked:', error);
          // Set default values in case of error
          setSelectedMessage(message);
          setIsLiked(false);
          setLikesCount(message.likesCount || 0);
        });
    } else {
      setSelectedMessage(message);
      setIsLiked(false);
      setLikesCount(message.likesCount || 0);
    }
  };

  // Handle liking a message
  const handleLikeMessage = async (e) => {
    e.stopPropagation();
    if (!selectedMessage || !selectedMessage.dbId || !currentUsername) return;

    try {
      
      const response = await apiService.likeMessage(selectedMessage.dbId);
      if (response.success) {
        setIsLiked(response.liked);
        setLikesCount(response.likesCount);
        
        // Update the selected message with new like count
        setSelectedMessage(prev => ({
          ...prev,
          likesCount: response.likesCount,
          likedByCurrentUser: response.liked
        }));
        
        // Update cache
        if (response.liked) {
          // Add to cache if not already there
          const messageIdStr = selectedMessage.dbId.toString();
          setLikedMessagesCache(prev => {
            if (!prev) return [selectedMessage.dbId];
            
            // Check if it's already in the cache using string comparison
            const exists = prev.some(id => id.toString() === messageIdStr);
            return exists ? prev : [...prev, selectedMessage.dbId];
          });
        } else {
          // Remove from cache
          const messageIdStr = selectedMessage.dbId.toString();
          setLikedMessagesCache(prev => {
            if (!prev) return [];
            return prev.filter(id => id.toString() !== messageIdStr);
          });
        }
        
        
        // Update cache immediately to avoid delay in UI updates
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Set map view only when component mounts or userLocation changes (but NOT when messages update)
  useEffect(() => {
    // Only set the initial position once
    if (!hasSetInitialPosition.current) {
      // First priority: Use user's current location if available
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        setViewState({
          longitude: userLocation.longitude,
          latitude: userLocation.latitude,
          zoom: 14 // Closer zoom for user's location
        });
        hasSetInitialPosition.current = true;
        return;
      }
      
      // Second priority: Use location from recent messages
      const messagesWithLocation = messages.filter(msg => 
        msg.location && !msg.location.error && 
        msg.location.latitude && msg.location.longitude
      );

      if (messagesWithLocation.length > 0) {
        // Use the location of the most recent message
        const latestMessage = messagesWithLocation[messagesWithLocation.length - 1];
        setViewState({
          longitude: latestMessage.location.longitude,
          latitude: latestMessage.location.latitude,
          zoom: 12
        });
        hasSetInitialPosition.current = true;
      }
    }
  }, [userLocation]); // Remove messages from dependencies to avoid resetting view on refresh

  // Track message refreshes for debugging and handle selected message updates
  useEffect(() => {
    const messagesCount = messages.length;
    
    // Only log when count changes
    if (messagesCount !== prevMessagesCountRef.current) {
      console.log(`MapView: Message count changed from ${prevMessagesCountRef.current} to ${messagesCount}`);
      
      // When messages are refreshed, update selected message data if needed
      if (selectedMessage) {
        const refreshedMessage = messages.find(msg => msg.dbId === selectedMessage.dbId);
        if (refreshedMessage) {
          setSelectedMessage(refreshedMessage);
          setIsLiked(refreshedMessage.likedByCurrentUser || false);
          setLikesCount(refreshedMessage.likesCount || 0);
        }
      }
      
      prevMessagesCountRef.current = messagesCount;
    }
  }, [messages, selectedMessage]);
  
  // Filter messages that have valid location data
  const messagesWithLocation = messages.filter(msg => 
    msg.location && !msg.location.error && 
    msg.location.latitude && msg.location.longitude
  );

  // Log the like status for all messages on the map
  useEffect(() => {
    if (messagesWithLocation.length > 0 && currentUsername) {
      messagesWithLocation.forEach(message => {
        const messageId = message.dbId || message._id;
        
        // Check if liked using either the message property or the cache
        const isLiked = message.likedByCurrentUser || 
          (likedMessagesCache && likedMessagesCache.some(id => {
            // Convert both to strings to ensure consistent comparison
            return messageId && id.toString() === messageId.toString();
          }));
        
        // Get the text content (might be in either content or text property)
        const messageText = message.content || message.text || '';
        
      });
    }
  }, [messagesWithLocation, likedMessagesCache, currentUsername]);

  // Add detailed logging of liked messages with message content
  const logDetailedLikedMessages = useCallback(async () => {
    if (!currentUsername || !likedMessagesCache || likedMessagesCache.length === 0) return;
    
    try {
      // Get all messages from the API
      const response = await apiService.getAllMessages(null, currentUsername);
      
      // Check for the correct response structure for the API
      if (response && response.messages && Array.isArray(response.messages)) {
        // Filter for messages that are in the user's liked messages
        const likedMessagesDetails = response.messages.filter(message => {
          const messageId = message._id || message.dbId; // Server may use _id
          return messageId && likedMessagesCache.some(id => 
            id.toString() === messageId.toString()
          );
        });
        
        
        // Sort by most recent first and log details
        const sortedMessages = likedMessagesDetails.sort((a, b) => 
          new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
        );
        
        if (sortedMessages.length === 0) {
        } else {
          sortedMessages.forEach((message, index) => {
            const messageText = message.text || message.content || '';
            const timestamp = new Date(message.createdAt || message.timestamp).toLocaleString();
          });
        }
        
      } else {
      }
    } catch (error) {
      console.error('Error fetching detailed liked messages:', error);
    }
  }, [currentUsername, likedMessagesCache]);
  
  // Call the detailed logger when likedMessagesCache changes
  useEffect(() => {
    if (likedMessagesCache && likedMessagesCache.length > 0) {
      logDetailedLikedMessages();
    }
  }, [likedMessagesCache, logDetailedLikedMessages]);

  // Remove focus from like button when popup opens
  useEffect(() => {
    if (selectedMessage && likeButtonRef.current) {
      // Wait a tiny bit for the DOM to update
      setTimeout(() => {
        // Blur the like button if it's focused
        if (document.activeElement === likeButtonRef.current) {
          likeButtonRef.current.blur();
        }
      }, 50);
    }
  }, [selectedMessage]);

  // Add this new effect to ensure 3D buildings layer is added when needed
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    
    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => {
        addBuildingLayer(map);
      });
    } else {
      addBuildingLayer(map);
    }
    
    return () => {
      // Cleanup if needed
      if (map.getLayer('3d-buildings')) {
        map.removeLayer('3d-buildings');
      }
    };
  }, [is3DMode, isDarkMode]);
  
  // Function to add 3D building layer
  const addBuildingLayer = (map) => {
    // Remove existing layer if it exists
    if (map.getLayer('3d-buildings')) {
      map.removeLayer('3d-buildings');
    }
    
    // Only add the layer if in 3D mode
    if (is3DMode) {
      map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 14,
        'paint': {
          'fill-extrusion-color': isDarkMode ? '#242526' : '#aaa',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': isDarkMode ? 0.8 : 0.6
        }
      }, 'waterway-label');
    }
  };

  return (
    <div className={`map-container ${is3DMode ? 'is-3d-mode' : ''}`}>
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={isDarkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
        mapboxAccessToken="pk.eyJ1IjoiZGFya25pZ2h0MDA3IiwiYSI6ImNqOXpiMWF3MjhuajEyeHFzcjhzdDVzN20ifQ.DlcipLyUIsK1pVHRtPK9Mw"
        terrain={is3DMode ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="map-loading-indicator">
            <div className="spinner"></div>
            <p>Refreshing pins...</p>
          </div>
        )}
        
        <WeatherWidget 
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          isDarkMode={isDarkMode}
        />
        
        {messagesWithLocation.map((message, index) => (
          <Marker
            key={index}
            longitude={message.location.longitude}
            latitude={message.location.latitude}
            anchor="bottom"
            onClick={e => onSelectMessage(e, message)}
          >
            <div className="map-marker">
              <AvatarPlaceholder 
                username={message.sender} 
                size="40px" 
                className="marker-avatar" 
              />
              {onlineUsers && onlineUsers[message.sender] && (
                <span className="online-indicator-map"></span>
              )}
            </div>
          </Marker>
        ))}

        {selectedMessage && (
          <Popup
            longitude={selectedMessage.location.longitude}
            latitude={selectedMessage.location.latitude}
            anchor={is3DMode ? "bottom" : "top"}
            offsetTop={is3DMode ? -40 : 0}
            onClose={() => setSelectedMessage(null)}
            closeOnClick={false}
            closeButton={true}
            className={`map-popup ${isDarkMode ? 'dark-mode' : ''}`}
            maxWidth="300px"
          >
            <div 
              className={`message-card ${isDarkMode ? 'dark-mode' : ''}`}
              onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up to map
            >
              <div className="message-card-header">
                <AvatarPlaceholder 
                  username={selectedMessage.sender} 
                  size="40px" 
                  className="message-avatar"
                  onClick={(e) => navigateToProfile(selectedMessage.sender, e)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="message-sender-info">
                  <span 
                    className="message-sender"
                    onClick={(e) => navigateToProfile(selectedMessage.sender, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    {selectedMessage.sender}
                    {onlineUsers && onlineUsers[selectedMessage.sender] && (
                      <span className="online-indicator"></span>
                    )}
                  </span>
                  <span className="message-timestamp">
                    {timeAgo(selectedMessage.timestamp)}
                  </span>
                </div>
              </div>
              {selectedMessage.image && (
                <div className="message-card-image">
                  <img src={selectedMessage.image} alt="Message attachment" />
                </div>
              )}
              <div className="message-card-content">
                {renderTextWithLinks(selectedMessage.content)}
              </div>
              <div className="message-card-footer">
                <button 
                  ref={likeButtonRef}
                  className={`like-button ${isLiked ? 'liked' : ''}`}
                  onClick={handleLikeMessage}
                  disabled={!currentUsername}
                  title={currentUsername ? 'Like this message' : 'Sign in to like messages'}
                  tabIndex="-1"
                >
                  {isLiked ? 
                    <GoHeartFill className="heart-filled" /> : 
                    <GoHeart className="heart-outline" />
                  }
                  <span className="like-count">{likesCount > 0 ? likesCount : ''}</span>
                </button>
                <button 
                  className="location-button"
                  onClick={() => alert(`Location: ${selectedMessage.location.latitude}, ${selectedMessage.location.longitude}${selectedMessage.location.fuzzyLocation === false ? ' (Exact)' : ' (Approximate)'}`)}
                  title="View location details"
                  tabIndex="-1"
                >
                  <GoLocation className="location-icon" /> 
                  {selectedMessage.location.fuzzyLocation === false ? 'Exact' : 'Approximate'}
                </button>
              </div>
            </div>
          </Popup>
        )}
      </ReactMapGL>

      {/* Center on Me Button */}
      {userLocation && userLocation.latitude && userLocation.longitude && (
        <button 
          className="center-on-me-btn"
          onClick={() => {
            setViewState({
              longitude: userLocation.longitude,
              latitude: userLocation.latitude,
              zoom: 14, // Closer zoom for user's location
              pitch: is3DMode ? 45 : 0, // Maintain pitch if in 3D mode
              bearing: 0 // Set to 0 to prevent the "null" bearing error
            });
          }}
          title="Center map on my location"
        >
          <GoHome size={20} />
        </button>
      )}

      {/* Toggle 3D Mode Button */}
      <button 
        className={`toggle-3d-btn ${is3DMode ? 'active' : ''}`}
        onClick={toggle3DMode}
        title={is3DMode ? "Switch to 2D mode" : "Switch to 3D mode"}
      >
        <GoStack />
      </button>
      
      {/* 3D loading indicator */}
      {is3DMode && !is3DLoaded && (
        <div className={`three-loading ${isDarkMode ? 'dark-mode' : ''}`}>
          <div className="three-loading-spinner"></div>
          <p>Loading 3D view...</p>
        </div>
      )}
      
      {/* 3D view hint */}
      <div className={`three-view-hint ${showHint ? 'visible' : ''}`}>
        Drag to pan • Scroll to zoom • Right-click + drag to rotate
      </div>

      {/* Empty state message */}
      {messagesWithLocation.length === 0 && (
        <div className={`no-location-messages ${isDarkMode ? 'dark-mode' : ''}`}>
          <GoLocation size={32} className="empty-state-icon" />
          <p>The map is looking a bit empty!</p>
          <p>Share what's happening around you to drop a pin!</p>
          {isLoading && <div className="loading-spinner"></div>}
          {!isLoading && (
            <button 
              className="refresh-button"
              onClick={() => {
                console.log('🗺️ MapView: Manual refresh requested');
                const fetchMessagesEvent = new CustomEvent('map:fetchMessages');
                window.dispatchEvent(fetchMessagesEvent);
              }}
            >
              Refresh Map
            </button>
          )}
        </div>
      )}
    </div>
  );
};

MapView.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      isReceived: PropTypes.bool,
      location: PropTypes.shape({
        latitude: PropTypes.number,
        longitude: PropTypes.number,
        error: PropTypes.string
      }),
      likesCount: PropTypes.number
    })
  ),
  currentUsername: PropTypes.string,
  onlineUsers: PropTypes.object,
  userLocation: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    isFallback: PropTypes.bool
  }),
  isDarkMode: PropTypes.bool,
  isLoading: PropTypes.bool
};

MapView.defaultProps = {
  messages: [],
  currentUsername: null,
  onlineUsers: {},
  userLocation: null,
  isDarkMode: false,
  isLoading: false
};

export default MapView; 