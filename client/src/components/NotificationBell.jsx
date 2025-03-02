import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import './NotificationBell.css';

const NotificationBell = ({ 
  notifications = [],
  onClearNotifications,
  isDarkMode
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle notification dropdown
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    
    // Add ripple effect
    const bell = document.querySelector('.notification-bell');
    if (bell) {
      // Remove any existing ripple
      const existingRipple = bell.querySelector('.ripple');
      if (existingRipple) {
        existingRipple.remove();
      }
      
      // Create new ripple element
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      bell.appendChild(ripple);
      
      // Position the ripple
      const rect = bell.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${rect.width / 2 - size / 2}px`;
      ripple.style.top = `${rect.height / 2 - size / 2}px`;
      
      // Remove ripple after animation completes
      setTimeout(() => {
        if (ripple && ripple.parentNode) {
          ripple.remove();
        }
      }, 600);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Navigate to user profile
    navigate(`/profile/${notification.sender}`);
    setShowDropdown(false);
  };

  return (
    <div className={`notification-bell-container ${isDarkMode ? 'dark-mode' : ''}`} ref={dropdownRef}>
      <div className="notification-bell" onClick={toggleDropdown}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="none" d="M0 0h24v24H0z"/>
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {showDropdown && (
        <div className={`notification-dropdown ${isDarkMode ? 'dark-mode' : ''}`}>
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearNotifications();
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="notification-content">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications</p>
              </div>
            ) : (
              <ul className="notification-list">
                {notifications.map(notification => (
                  <li 
                    key={notification.id} 
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-info">
                      <span className="notification-user">{notification.sender}</span>
                      <span className="notification-time">{formatTime(notification.timestamp)}</span>
                    </div>
                    <p className="notification-text">{notification.preview}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

NotificationBell.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      sender: PropTypes.string.isRequired,
      preview: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
      read: PropTypes.bool.isRequired
    })
  ),
  onClearNotifications: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

export default NotificationBell; 