import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import NavigationHeader from '../NavigationHeader';
import MapView from '../MapView';
import FloatingActionButton from '../FloatingActionButton';
import MessageModal from '../MessageModal';
import ProfilePage from '../profile/ProfilePage';

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
  onClearNotifications,
  isLoading,
  canUserSendMessage,
  getTimeRemainingBeforeNextMessage,
  handleRefreshMap
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

  // Format milliseconds to minutes and seconds
  const formatTimeRemaining = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const openModal = () => {
    if (canUserSendMessage()) {
      setIsModalOpen(true);
    } else {
      // Calculate initial time remaining
      const initialTimeRemaining = getTimeRemainingBeforeNextMessage();
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
  
  // Wrapper for handleSocketMessage to check for 30-minute limit
  const handleMessageSubmit = async (message, formData) => {
    const result = await handleSocketMessage(message, formData);
    
    if (result && result.error) {
      // Show countdown modal if user tries to bypass the 30-minute limit
      const initialTimeRemaining = result.timeRemaining || getTimeRemainingBeforeNextMessage();
      setTimeRemaining(initialTimeRemaining);
      setCountdownModalOpen(true);
      closeModal();
      
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
      
      return false;
    }
    
    closeModal();
    return true;
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const getInitialRoute = () => {
    // Use last active tab from local storage or default to map
    return createPath(user?.username ? (localStorage.getItem('lastActiveTab') || 'map') : 'map');
  };

  const createPath = (path) => {
    if (path === 'map') return '/map';
    if (path === 'profile' && user?.username) return `/profile/${user.username}`;
    return '/map'; // Default to map
  };

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
            <main className={`app-main ${isDarkMode ? 'dark-mode' : ''}`}>
              <div className={`tab-content ${isDarkMode ? 'dark-mode' : ''}`}>
                <MapView 
                  messages={messages} 
                  currentUsername={user ? user.username : null} 
                  onlineUsers={onlineUsers}
                  userLocation={userLocation}
                  isDarkMode={isDarkMode}
                  isLoading={isLoading}
                  onRefreshMap={handleRefreshMap}
                />
              </div>
            </main>

            {/* Floating Action Button for sharing updates */}
            <FloatingActionButton onClick={openModal} isDarkMode={isDarkMode} />
            
            {/* Update Modal */}
            <MessageModal 
              isOpen={isModalOpen} 
              onClose={closeModal} 
              onShareUpdate={handleMessageSubmit}
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
                      style={{ margin: '20px auto' }}
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
  onClearNotifications: PropTypes.func,
  isLoading: PropTypes.bool,
  canUserSendMessage: PropTypes.func,
  getTimeRemainingBeforeNextMessage: PropTypes.func,
  handleRefreshMap: PropTypes.func
};

export default AppContent; 