import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GoHeart, GoHeartFill, GoPin } from "react-icons/go";
import AvatarPlaceholder from './AvatarPlaceholder';
import apiService from '../services/apiService';
import authService from '../services/authService';
import { timeAgo } from '../utils/dateUtils';
import './Message.css';

// Log all available icons


const Message = ({ messageId, sender, content, timestamp, isReceived, location, isOnline, currentUsername, likesCount: initialLikesCount = 0, likedByCurrentUser, image }) => {
  const [liked, setLiked] = useState(likedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  
  // Check if user already liked this message when component mounts or props change
  useEffect(() => {
    // Set initial likes count
    setLikesCount(initialLikesCount);
    
    // Set liked status based on whether current user has liked the message
    setLiked(likedByCurrentUser || false);
  }, [messageId, initialLikesCount, likedByCurrentUser]);
  
  // Format timestamp using the timeAgo function
  const formattedTimeAgo = timeAgo(timestamp);
  
  // Format location if available
  const formattedLocation = location ? 
    (location.error ? 
      <><GoPin /> Location unavailable</> : 
      <><GoPin /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</>) : 
    '';
  
  // Determine if username should be clickable (non-system messages)
  const isSystemMessage = sender === 'System' || sender === 'Server' || sender === 'Error';
  
  // Handle like button click
  const handleLikeClick = async () => {
    if (!messageId || !currentUsername || isSystemMessage) return;
    
    try {
      // Use the likeMessage endpoint which now handles both like and unlike (toggle)
      const response = await apiService.likeMessage(messageId);
      if (response.success) {
        setLiked(response.liked);
        setLikesCount(response.likesCount);
      }
    } catch (error) {
      
    }
  };

  // Determine message class based on type and liked status
  const messageClass = isSystemMessage 
    ? `message system ${sender.toLowerCase()}` 
    : `message ${liked ? 'liked-message' : ''}`;

  return (
    <div className={messageClass}>
      {!isSystemMessage ? (
        <>
          <div className="message-header">
            {sender && (
              <>
                {/* Avatar */}
                <AvatarPlaceholder 
                  username={sender} 
                  size="40px" 
                  className="message-avatar" 
                />
                
                {/* Sender info */}
                <div className="message-sender-info">
                  {isSystemMessage ? (
                    <span className="message-sender">{sender}</span>
                  ) : (
                    <Link to={`/profile/${sender}`} className="message-sender">
                      {sender}
                      {isOnline && <span className="online-indicator"></span>}
                    </Link>
                  )}
                  <span className="message-timestamp">{formattedTimeAgo}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="message-content">
            {image && (
              <div className="message-image-container">
                <img src={image} alt="Message attachment" className="message-image" />
              </div>
            )}
            {content}
          </div>
          
          <div className="message-footer">
            {formattedLocation && (
              <span className="message-location">{formattedLocation}</span>
            )}
            
            {!isSystemMessage && (
              <div className="message-actions">
                <button 
                  className={`like-button ${liked ? 'liked' : ''}`} 
                  onClick={handleLikeClick}
                  disabled={!currentUsername}
                  title={currentUsername ? 'Like this message' : 'Sign in to like messages'}
                >
                  {liked ? <GoHeartFill className="heart-filled" /> : <GoHeart />}
                  <span className="like-count">{likesCount > 0 ? likesCount : ''}</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="message-header">
            <span className="message-timestamp">{formattedTimeAgo}</span>
          </div>
          <div className="message-content">
            {image && (
              <div className="message-image-container">
                <img src={image} alt="Message attachment" className="message-image" />
              </div>
            )}
            {content}
          </div>
        </>
      )}
    </div>
  );
};

Message.propTypes = {
  messageId: PropTypes.string,
  sender: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]).isRequired,
  isReceived: PropTypes.bool,
  location: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    error: PropTypes.string
  }),
  isOnline: PropTypes.bool,
  currentUsername: PropTypes.string,
  likesCount: PropTypes.number,
  likedByCurrentUser: PropTypes.bool,
  image: PropTypes.string
};

Message.defaultProps = {
  timestamp: new Date(),
  isReceived: false,
  location: null,
  isOnline: undefined,
  messageId: null,
  currentUsername: null,
  likesCount: 0,
  likedByCurrentUser: false,
  image: null
};

export default Message; 