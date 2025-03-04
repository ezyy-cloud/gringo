import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactMapGL, { Marker, Popup } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import { GoHeart, GoHeartFill, GoLocation, GoHome } from "react-icons/go";
import AvatarPlaceholder from './AvatarPlaceholder';
import { timeAgo } from '../utils/dateUtils';
import apiService from '../services/apiService';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapView.css';

const MapView = ({ messages, currentUsername, onlineUsers, userLocation, isDarkMode }) => {
  const [viewState, setViewState] = useState({
    longitude: -73.935242,  // Default to NYC coordinates
    latitude: 40.730610,
    zoom: 12
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedMessagesCache, setLikedMessagesCache] = useState(null);
  const mapRef = useRef();
  const navigate = useNavigate();
  const likeButtonRef = useRef(null);

  // Handle navigation to user profile
  const navigateToProfile = (username, e) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
    setSelectedMessage(null); // Close popup after navigation
  };

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

  // Set map view when component mounts or when userLocation changes
  useEffect(() => {
    // First priority: Use user's current location if available
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      setViewState({
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: 14 // Closer zoom for user's location
      });
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
    }
  }, [userLocation, messages]); // Re-run when userLocation or messages change

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

  // Fly to user location when available and button clicked
  // ... existing code ...

  return (
    <div className="map-container">
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={isDarkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
        mapboxAccessToken="pk.eyJ1IjoiZGFya25pZ2h0MDA3IiwiYSI6ImNqOXpiMWF3MjhuajEyeHFzcjhzdDVzN20ifQ.DlcipLyUIsK1pVHRtPK9Mw"
      >
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
            anchor="top"
            onClose={() => setSelectedMessage(null)}
            closeOnClick={false}
            closeButton={true}
            className={`map-popup ${isDarkMode ? 'dark-mode' : ''}`}
          >
            <div className={`message-card ${isDarkMode ? 'dark-mode' : ''}`}>
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
              <div className="message-card-content">{selectedMessage.content}</div>
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
              zoom: 14 // Closer zoom for user's location
            });
          }}
          title="Center map on my location"
        >
          <GoHome size={20} />
        </button>
      )}

      {messagesWithLocation.length === 0 && (
        <div className={`no-location-messages ${isDarkMode ? 'dark-mode' : ''}`}>
          <GoLocation size={32} className="empty-state-icon" />
          <p>The map is looking a bit empty!</p>
          <p>Share whats happening around you to drop a pin!</p>
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
  isDarkMode: PropTypes.bool
};

MapView.defaultProps = {
  messages: [],
  currentUsername: null,
  onlineUsers: {},
  userLocation: null,
  isDarkMode: false
};

export default MapView; 