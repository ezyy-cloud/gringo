import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import authService from '../../services/authService';
import apiService from '../../services/apiService';
import AvatarPlaceholder from '../AvatarPlaceholder';
import { timeAgo } from '../../utils/dateUtils';
import './ProfilePage.css';
import { GoHeartFill, GoComment, GoLocation, GoSun, GoMoon, GoBell, GoBellSlash, GoCheck, GoInfo, GoTrash } from 'react-icons/go';
import socketService from '../../services/socketService';
import { AppContext } from '../../context/AppContext';
import { FaUserPlus, FaUserCheck, FaSignOutAlt } from 'react-icons/fa';

// Add a list of predefined colors
const profileCoverColors = [
  '#1da1f2', // Twitter blue
  '#4267B2', // Facebook blue
  '#833AB4', // Instagram purple
  '#E1306C', // Instagram pink
  '#2867B2', // LinkedIn blue
  '#FF0000', // YouTube red
  '#1DB954', // Spotify green
  '#FF5700', // Reddit orange
  '#00aff0', // Skype blue
  '#7289da', // Discord purple
  '#25D366', // WhatsApp green
  '#34B7F1', // Telegram blue
  '#000000', // Black
  '#6441a5'  // Twitch purple
];

const ProfilePage = ({ user: userProp, onlineUsers = {}, isDarkMode, toggleDarkMode }) => {
  const { username: usernameParam } = useParams(); // Get username from URL params
  const navigate = useNavigate();
  const { messagesTimestamp } = useContext(AppContext);
  const [user, setUser] = useState(userProp || null);
  const [isLoading, setIsLoading] = useState(!userProp);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesPerPage = 10; // Number of messages to load at a time
  const [isCurrentUser, setIsCurrentUser] = useState(!usernameParam);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState(null);
  const [totalLikes, setTotalLikes] = useState(0);
  const [topLikedMessages, setTopLikedMessages] = useState([]);
  const [likedMessages, setLikedMessages] = useState([]);
  const [isLoadingLikedMessages, setIsLoadingLikedMessages] = useState(false);
  const [isLoadingMoreLikedMessages, setIsLoadingMoreLikedMessages] = useState(false);
  const [likedMessagesPage, setLikedMessagesPage] = useState(1);
  const [hasMoreLikedMessages, setHasMoreLikedMessages] = useState(true);
  const [activeTab, setActiveTab] = useState('messages'); // New state for active tab: 'messages' or 'likes'
  const tabsRef = useRef(null);
  const [tabsSticky, setTabsSticky] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(Notification.permission === 'granted');
  
  // Form fields
  const [formData, setFormData] = useState({
    username: userProp?.username || '',
    email: userProp?.email || '',
    profilePicture: userProp?.profilePicture || '',
    coverColor: userProp?.coverColor || '#1da1f2', // Default to Twitter blue if not set
    bio: userProp?.bio || 'Just another gringo', // Add bio with default value
    darkMode: userProp?.darkMode || false // Add darkMode with default value
  });

  // Function to fetch user messages (memoized to prevent dependency issues)
  const fetchUserMessages = useCallback(async () => {
    if (!user?.username) return;
    
    try {
      setIsLoadingMessages(true);
      
      // Get current username for checking if messages are liked by the current user
      const currentUser = authService.getUser();
      const currentUsername = currentUser ? currentUser.username : null;
      
      const response = await apiService.getUserMessages(user.username, currentUsername);
      
      
      // If we're on the first page, update the displayed messages
      if (messagesPage === 1) {
        const firstPageMessages = response.messages.slice(0, messagesPerPage);
        setUserMessages(firstPageMessages);
        
        // Check if there are more messages to load
        setHasMoreMessages(response.messages.length > messagesPerPage);
        
        // Update all messages cache
        window.allUserMessages = response.messages;
      }
    } catch (error) {
      
      setError('Failed to load user messages. Please try again.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user?.username, messagesPage, messagesPerPage]);

  // Get user data based on props or URL params
  useEffect(() => {
    // Get current username for follow functionality
    const loggedInUser = authService.getUser();
    if (loggedInUser) {
      setCurrentUsername(loggedInUser.username);
    }

    // If viewing someone else's profile via URL parameter
    if (usernameParam) {
      const fetchUserByUsername = async () => {
        try {
          setIsLoading(true);
          
          // Get the current user for checking follow status
          const currentUser = authService.getUser();
          const currentUsername = currentUser ? currentUser.username : null;
          
          // Call API to get user by username, passing current username to check follow status
          const result = await apiService.getUserByUsername(usernameParam, currentUsername);
          
          if (result.success) {
            setUser(result.data.user);
            
            // Set isFollowing based on API response
            if (Object.prototype.hasOwnProperty.call(result.data.user, 'isFollowing')) {
              setIsFollowing(result.data.user.isFollowing);
            }
            
            // Check if this is the current user
            const isCurrentUserProfile = currentUser?.username === result.data.user.username;
            setIsCurrentUser(isCurrentUserProfile);
          } else {
            setError('User not found');
          }
        } catch (error) {
          
          setError('Failed to load user profile');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUserByUsername();
      return;
    }
    
    // If user is provided via props
    if (userProp) {
      setUser(userProp);
      
      setIsLoading(false);
      setFormData({
        username: userProp.username,
        email: userProp.email,
        profilePicture: userProp.profilePicture || '',
        coverColor: userProp.coverColor || '#1da1f2',
        bio: userProp.bio || 'Just another gringo',
        darkMode: userProp.darkMode || false
      });
      setIsCurrentUser(true);
      return;
    }
    
    // Otherwise, fetch current user's data
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const result = await authService.getCurrentUser();
        if (result.success) {
          
          setUser(result.data.user);
          setFormData({
            username: result.data.user.username,
            email: result.data.user.email,
            profilePicture: result.data.user.profilePicture || '',
            coverColor: result.data.user.coverColor || '#1da1f2',
            bio: result.data.user.bio || 'Just another gringo',
            darkMode: result.data.user.darkMode || false
          });
          setIsCurrentUser(true);
        }
      } catch (error) {
        
        setError('Failed to load user data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userProp, usernameParam]);

  // Get notification permission status on component mount
  useEffect(() => {
    setNotificationEnabled(Notification.permission === 'granted');
  }, []);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    try {
      setFollowStatus('loading');
      
      if (isFollowing) {
        // Unfollow user
        const result = await apiService.unfollowUser(user.username, currentUsername);
        if (result.success) {
          setIsFollowing(false);
          setUser(prevUser => ({ 
            ...prevUser, 
            followersCount: result.data.followersCount,
            followingCount: result.data.followingCount
          }));
          setFollowStatus('success');
          
          // Refresh current user data to update their following count
          if (currentUsername) {
            const currentUserData = await apiService.getUserByUsername(currentUsername);
            if (currentUserData.success) {
              // If this user is shown elsewhere in the UI, you might want to update global state here
              
            }
          }
        } else {
          setFollowStatus('error');
          
        }
      } else {
        // Follow user
        const result = await apiService.followUser(user.username, currentUsername);
        if (result.success) {
          setIsFollowing(true);
          setUser(prevUser => ({ 
            ...prevUser, 
            followersCount: result.data.followersCount,
            followingCount: result.data.followingCount
          }));
          setFollowStatus('success');
          
          // Refresh current user data to update their following count
          if (currentUsername) {
            const currentUserData = await apiService.getUserByUsername(currentUsername);
            if (currentUserData.success) {
              // If this user is shown elsewhere in the UI, you might want to update global state here
              
            }
          }
        } else {
          setFollowStatus('error');
          
        }
      }
    } catch (error) {
      setFollowStatus('error');
      
    } finally {
      // Reset follow status after 2 seconds
      setTimeout(() => {
        setFollowStatus(null);
      }, 2000);
    }
  };

  // Fetch user messages when user data is available
  useEffect(() => {
    // Reset page when user changes 
    setMessagesPage(1);
    fetchUserMessages();
  }, [user?.username, fetchUserMessages]);

  // Listen for message refresh events
  useEffect(() => {
    if (!user?.username) return;
    
    // Set up listener for refreshMessages event
    const handleRefreshMessages = () => {
      
      // Re-fetch user messages when refresh signal is received
      fetchUserMessages();
    };
    
    // Add event listener for refresh messages
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('refreshMessages', handleRefreshMessages);
      
      // Clean up the event listener when component unmounts
      return () => {
        socket.off('refreshMessages', handleRefreshMessages);
      };
    }
  }, [user?.username, fetchUserMessages]);

  // Update user data when onlineUsers changes
  useEffect(() => {
    if (user && onlineUsers[user.username] !== undefined) {
      setUser(prev => ({
        ...prev,
        isOnline: onlineUsers[user.username]
      }));
    }
  }, [onlineUsers, user?.username]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await authService.updateProfile(formData);
      if (result.success) {
        setUser({ ...user, ...formData });
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        
        // If dark mode was changed, reload the page to apply the change
        if (formData.darkMode !== user.darkMode) {
          window.location.reload();
        }
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } catch (error) {
      
      setError('An error occurred. Please try again.');
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture || '',
      coverColor: user.coverColor || '#1da1f2',
      bio: user.bio || 'Just another gringo',
      darkMode: user.darkMode || false
    });
    setIsEditing(false);
    setError(null);
  };

  // Format date for display (kept for member since date)
  const formatDate = (dateString) => {
    
    
    if (!dateString) {
      
      return 'Not available';
    }
    
    try {
      // Try to parse the ISO date string
      
      const date = new Date(dateString);
      
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        
        return 'Invalid date';
      }
      
      // Format the date to show only month and year
      const dateOptions = { year: 'numeric', month: 'long' };
      
      const formattedDate = date.toLocaleDateString(undefined, dateOptions);
      
      return formattedDate;
    } catch (error) {
      
      return 'Date format error';
    }
  };

  // Function to load more messages
  const handleLoadMoreMessages = () => {
    if (!window.allUserMessages || isLoadingMoreMessages) return;
    
    setIsLoadingMoreMessages(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const nextPage = messagesPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * messagesPerPage;
      
      // Get next page of messages from our stored array
      const nextPageMessages = window.allUserMessages.slice(startIndex, endIndex);
      
      // Make sure the messages maintain their likedByCurrentUser flag
      setUserMessages(nextPageMessages);
      setMessagesPage(nextPage);
      setHasMoreMessages(window.allUserMessages.length > endIndex);
      setIsLoadingMoreMessages(false);
    }, 500);
  };

  // Fetch user's total likes
  useEffect(() => {
    const fetchUserLikes = async () => {
      if (!user?.username) return;
      
      try {
        const response = await apiService.getUserLikes(user.username);
        if (response.success) {
          setTotalLikes(response.totalLikes);
          // Store the top liked messages if provided
          if (response.topLikedMessages) {
            
            // Debug each message to check location data
            response.topLikedMessages.forEach((msg, index) => {
              
            });
            setTopLikedMessages(response.topLikedMessages);
          }
        }
      } catch (error) {
        
      }
    };
    
    fetchUserLikes();
  }, [user?.username, messagesTimestamp]);

  // Fetch messages liked by the user when the likes tab is selected
  useEffect(() => {
    const fetchLikedMessages = async () => {
      if (!user?.username || activeTab !== 'likes') return;
      
      setIsLoadingLikedMessages(true);
      setLikedMessagesPage(1); // Reset page when user or tab changes
      
      try {
        // Get current username for checking if messages are liked by the current user
        const currentUser = authService.getUser();
        const currentUsername = currentUser ? currentUser.username : null;
        
        const response = await apiService.getLikedMessages(user.username, currentUsername);
        if (response.success) {
          // If we're viewing our own likes, automatically mark all messages as liked by the current user
          let messagesWithLikedFlag = response.likedMessages;
          if (isCurrentUser && currentUsername) {
            messagesWithLikedFlag = response.likedMessages.map(msg => ({
              ...msg,
              likedByCurrentUser: true
            }));
          }
          
          // Display only the first page of liked messages
          const firstPageLikedMessages = messagesWithLikedFlag.slice(0, messagesPerPage);
          setLikedMessages(firstPageLikedMessages);
          
          // Check if there are more messages to load
          setHasMoreLikedMessages(messagesWithLikedFlag.length > messagesPerPage);
          
          // Store all liked messages in a window property to avoid fetching again when loading more
          window.allLikedMessages = messagesWithLikedFlag;
        }
      } catch (error) {
        
      } finally {
        setIsLoadingLikedMessages(false);
      }
    };

    fetchLikedMessages();
  }, [user?.username, activeTab, messagesPerPage, messagesTimestamp]);

  // Function to format message text (truncate if too long)
  const formatMessageText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Add effect to mark body for profile page CSS targeting
  useEffect(() => {
    // Set the data-page attribute on the body for CSS targeting
    document.body.setAttribute('data-page', 'profile');
    
    // Cleanup function to remove the attribute when component unmounts
    return () => {
      document.body.removeAttribute('data-page');
    };
  }, []);

  // Add scroll listener for sticky tabs and title swap
  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const rect = tabsRef.current.getBoundingClientRect();
        const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
        
        // Check if tabs are at the top of the viewport (accounting for header)
        if (rect.top <= headerHeight) {
          if (!tabsSticky) setTabsSticky(true);
        } else {
          if (tabsSticky) setTabsSticky(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tabsSticky]);

  // Helper function to clear messages
  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3000);
  };

  // Toggle dark mode function
  const handleToggleDarkMode = async (e) => {
    try {
      // Get the current toggle state from the event
      const newDarkMode = e?.target?.checked !== undefined ? e.target.checked : !formData.darkMode;
      
      // Update form state
      setFormData(prev => ({
        ...prev,
        darkMode: newDarkMode
      }));
      
      // Call the global toggleDarkMode function from App.jsx if available
      if (toggleDarkMode) {
        // This will update the global state and apply the dark mode class to body
        toggleDarkMode();
        setSuccess('Dark mode preference updated!');
        clearMessages();
        return;
      }
      
      // Fallback to local implementation if toggleDarkMode prop is not available
      if (isEditing) {
        return; // In edit mode, changes will be saved on form submit
      }
      
      // If not in edit mode and no global toggle, update profile directly
      setSuccess('Updating dark mode preference...');
      
      const response = await authService.updateProfile({ darkMode: newDarkMode });
      if (response.success) {
        setSuccess('Dark mode preference updated!');
        
        // Update local user state to match
        setUser(prev => ({
          ...prev,
          darkMode: newDarkMode
        }));
        
        // Update body class for immediate feedback
        if (newDarkMode) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
        
        clearMessages();
      } else {
        setError('Failed to update dark mode preference.');
        clearMessages();
      }
    } catch (error) {
      
      setError('An error occurred while updating dark mode preference.');
      clearMessages();
    }
  };

  // Request notification permission function
  const requestNotificationPermission = async (e) => {
    // Prevent the default toggle behavior since notifications require browser prompts
    if (e) e.preventDefault();
    
    try {
      // If notifications are already enabled, just show a message
      if (notificationEnabled) {
        setError('Notifications are already enabled. To disable, use your browser settings.');
        clearMessages();
        return;
      }
      
      const granted = await socketService.requestNotificationPermission();
      if (granted) {
        setSuccess('Notifications enabled successfully!');
        setNotificationEnabled(true);
      } else {
        setError('Please enable notifications in your browser settings to receive alerts.');
        setNotificationEnabled(false);
      }

      clearMessages();
    } catch (error) {
      
      setError('Error enabling notifications. Please try again.');
      clearMessages();
    }
  };

  // Show instructions for disabling notifications
  const showNotificationDisableInstructions = (e) => {
    if (e) e.preventDefault();
    setSuccess('To disable notifications, click the lock icon in your browser address bar, then find site permissions.');
    clearMessages();
  };

  // Function to load more liked messages
  const handleLoadMoreLikedMessages = () => {
    if (!window.allLikedMessages || isLoadingMoreLikedMessages) return;
    
    setIsLoadingMoreLikedMessages(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const nextPage = likedMessagesPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * messagesPerPage;
      
      // Get next page of liked messages from our stored array
      const nextPageMessages = window.allLikedMessages.slice(startIndex, endIndex);
      
      // Make sure the messages maintain their likedByCurrentUser flag
      setLikedMessages(nextPageMessages);
      setLikedMessagesPage(nextPage);
      setHasMoreLikedMessages(window.allLikedMessages.length > endIndex);
      setIsLoadingMoreLikedMessages(false);
    }, 500);
  };

  // Add a function to handle message deletion
  const handleDeleteMessage = async (messageId) => {
    if (!isCurrentUser) return;
    
    try {
      const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
      if (!confirmed) return;
      
      const response = await apiService.deleteMessage(messageId);
      if (response.success) {
        // Update the local state to remove the deleted message
        setUserMessages(prevMessages => prevMessages.filter(message => message._id !== messageId));
        // Show success message
        setSuccess('Post deleted successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      setError('Failed to delete post. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className={`profile-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}
      
      {isLoading ? (
        <div className="profile-loading">Loading profile...</div>
      ) : (
        <>
          {user && (
            <div className="profile-card">
              {!isEditing ? (
                // View mode
                <>
                  <div 
                    className="profile-cover" 
                    style={{ backgroundColor: user.coverColor || '#1da1f2' }}
                  >
                    <div className="profile-avatar-container">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={`${user.username}'s avatar`}
                          className="profile-avatar"
                          onError={(e) => {
                            // Replace with AvatarPlaceholder
                            const parent = e.target.parentNode;
                            // Create and render AvatarPlaceholder directly
                            const placeholder = document.createElement('div');
                            placeholder.className = 'avatar-placeholder profile-avatar';
                            placeholder.style.backgroundColor = getBackgroundColor(user.username);
                            placeholder.style.width = '120px';
                            placeholder.style.height = '120px';
                            placeholder.style.display = 'flex';
                            placeholder.style.alignItems = 'center';
                            placeholder.style.justifyContent = 'center';
                            placeholder.style.color = '#fff';
                            placeholder.style.fontSize = '48px';
                            placeholder.style.fontWeight = 'bold';
                            placeholder.style.borderRadius = '50%';
                            placeholder.style.textTransform = 'uppercase';
                            
                            // Add the user's initials
                            function getInitials(name) {
                              if (!name) return '?';
                              const parts = name.split(/[\s_.-]+/);
                              if (parts.length === 1) {
                                return name.substring(0, 2).toUpperCase();
                              } else {
                                return (parts[0][0] + parts[Math.min(parts.length - 1, 1)][0]).toUpperCase();
                              }
                            }
                            
                            // Generate color based on username
                            function getBackgroundColor(name) {
                              if (!name) return '#6c757d';
                              const hash = name.split('').reduce(
                                (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
                              );
                              const colors = [
                                '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', 
                                '#DB2777', '#4338CA', '#059669', '#0891B2', '#EA580C'
                              ];
                              return colors[Math.abs(hash) % colors.length];
                            }
                            
                            placeholder.innerText = getInitials(user.username);
                            parent.replaceChild(placeholder, e.target);
                          }}
                        />
                      ) : (
                        // Use component directly with no additional wrapper
                        <AvatarPlaceholder 
                          username={user.username} 
                          size="120px" 
                          className="profile-avatar"
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="profile-header">
                    <div className="profile-username">
                      <h2>{user.username}</h2>
                      <span className={`status-badge ${user.isOnline ? 'online' : 'offline'}`}>
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="profile-actions">
                    {isCurrentUser && (
                      <button className="edit-button" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </button>
                    )}
                    {!isCurrentUser && (
                      <button 
                        className={`follow-button ${isFollowing ? 'following' : ''}`}
                        onClick={handleFollowToggle}
                        disabled={followStatus === 'loading'}
                      >
                        {followStatus === 'loading' ? 
                          <span className="follow-button-spinner"></span> : 
                          (isFollowing ? 'Following' : 'Follow')}
                      </button>
                    )}
                  </div>
                  </div>
                  
                  <div className="profile-bio">
                    <p>{user.bio || 'Just another gringo'}</p>
                  </div>

                  <div className="profile-details">
                    <div className="profile-field">
                      <span className="profile-label">Joined:</span>
                      <span className="profile-value">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                                    
                  <div className="profile-stats">
                    <div className="stat">
                      <span className="stat-value">{user.followersCount || 0}</span>
                      <span className="stat-label">Followers</span>
                    </div>
                    <div className="stat stat-middle">
                      <span className="stat-value">{user.followingCount || 0}</span>
                      <span className="stat-label">Following</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{totalLikes || 0}</span>
                      <span className="stat-label">Likes</span>
                    </div>
                  </div>
                  

                  
                  {/* Profile Tab Navigation - with sticky behavior */}
                  <div 
                    ref={tabsRef}
                    className={`profile-tabs ${tabsSticky ? 'sticky' : ''}`}
                  >
                    {/* Sticky username title that appears when scrolled */}
                    <div className="profile-sticky-title">
                      {user.username}
                    </div>
                    
                    <button 
                      className={`profile-tab ${activeTab === 'messages' ? 'active' : ''}`}
                      onClick={() => setActiveTab('messages')}
                    >
                      <GoComment className="tab-icon" />
                      <span>Updates</span>
                    </button>
                    <button 
                      className={`profile-tab ${activeTab === 'likes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('likes')}
                    >
                      <GoHeartFill className="tab-icon" />
                      <span>Likes</span>
                    </button>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="tab-content">
                    {/* Messages Tab */}
                    {activeTab === 'messages' && (
                      <div className="user-messages-section">
                        {isLoadingMessages ? (
                          <div className="loading-messages">Loading messages...</div>
                        ) : userMessages.length === 0 ? (
                          <p className="no-messages">{isCurrentUser ? 'You haven\'t posted any updates yet.' : `${user.username} hasn't posted any updates yet.`}</p>
                        ) : (
                          <>
                            <div className="user-messages-list instagram-style">
                              {userMessages
                                .slice()
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .map((message) => (
                                <div key={message._id} className="user-message-item facebook-style">
                                  <div className="message-header">
                                    {message.author?.profilePicture ? (
                                      <img 
                                        src={message.author?.profilePicture || user.profilePicture} 
                                        alt={`${message.author?.username || user.username}'s avatar`}
                                        className="message-avatar"
                                        onError={(e) => {
                                          // Use the same approach as for profile avatar
                                          const username = message.author?.username || user.username;
                                          const parent = e.target.parentNode;
                                          // Render AvatarPlaceholder directly instead of hiding
                                          const placeholderComponent = document.createElement('div');
                                          placeholderComponent.className = 'avatar-placeholder message-avatar';
                                          
                                          // Same helper functions as in profile avatar
                                          function getInitials(name) {
                                            if (!name) return '?';
                                            const parts = name.split(/[\s_.-]+/);
                                            if (parts.length === 1) {
                                              return name.substring(0, 2).toUpperCase();
                                            } else {
                                              return (parts[0][0] + parts[Math.min(parts.length - 1, 1)][0]).toUpperCase();
                                            }
                                          }
                                          
                                          function getBackgroundColor(name) {
                                            if (!name) return '#6c757d';
                                            const hash = name.split('').reduce(
                                              (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
                                            );
                                            const colors = [
                                              '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', 
                                              '#DB2777', '#4338CA', '#059669', '#0891B2', '#EA580C'
                                            ];
                                            return colors[Math.abs(hash) % colors.length];
                                          }
                                          
                                          placeholderComponent.style.backgroundColor = getBackgroundColor(username);
                                          placeholderComponent.style.width = '40px';
                                          placeholderComponent.style.height = '40px';
                                          placeholderComponent.style.display = 'flex';
                                          placeholderComponent.style.alignItems = 'center';
                                          placeholderComponent.style.justifyContent = 'center';
                                          placeholderComponent.style.color = '#fff';
                                          placeholderComponent.style.fontSize = '16px';
                                          placeholderComponent.style.fontWeight = 'bold';
                                          placeholderComponent.style.borderRadius = '50%';
                                          placeholderComponent.style.textTransform = 'uppercase';
                                          
                                          placeholderComponent.innerText = getInitials(username);
                                          parent.replaceChild(placeholderComponent, e.target);
                                        }}
                                      />
                                    ) : (
                                      <AvatarPlaceholder 
                                        username={message.author?.username || user.username} 
                                        size="40px" 
                                        className="message-avatar"
                                      />
                                    )}
                                    <div className="message-author-info">
                                      <span className="message-author">{message.author?.username || user.username}</span>
                                    </div>
                                    <span className="message-timestamp-right">{timeAgo(message.createdAt)}</span>
                                  </div>
                                  <div className="message-content-square">
                                    {message.image && (
                                      <img src={message.image} alt="Message" className="message-image" />
                                    )}
                                    <p className="message-text-bold">{message.text}</p>
                                  </div>
                                  <div className="message-actions">
                                    <div className="likes-count">
                                      <GoHeartFill className={`heart-icon ${message.likedByCurrentUser ? 'liked-by-user' : ''}`} /> {message.likesCount || 0}
                                    </div>
                                    <div className="message-action-buttons">
                                      {message.location ? (
                                        <button 
                                          className="location-button"
                                          onClick={() => alert(`Location: ${message.location.latitude.toFixed(6)}, ${message.location.longitude.toFixed(6)}`)}
                                        >
                                          <GoLocation className="location-icon" /> View Location
                                        </button>
                                      ) : (
                                        <div className="location-placeholder"></div>
                                      )}
                                      
                                      {isCurrentUser && (
                                        <button 
                                          className="delete-button"
                                          onClick={() => handleDeleteMessage(message._id)}
                                          aria-label="Delete post"
                                        >
                                          <GoTrash className="delete-icon" /> Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {hasMoreMessages && (
                              <div className="load-more-container">
                                <button 
                                  className="load-more-button" 
                                  onClick={handleLoadMoreMessages}
                                  disabled={isLoadingMoreMessages}
                                >
                                  {isLoadingMoreMessages ? 'Loading...' : 'Load More Updates'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Likes Tab */}
                    {activeTab === 'likes' && (
                      <div className="user-messages-section">
                        <h3 className="section-title">Messages {user.username} Liked</h3>
                        {isLoadingLikedMessages ? (
                          <div className="loading-messages">Loading liked messages...</div>
                        ) : likedMessages.length === 0 ? (
                          <p className="no-messages">{isCurrentUser ? 'You haven\'t liked any messages yet.' : `${user.username} hasn't liked any messages yet.`}</p>
                        ) : (
                          <>
                            <div className="user-messages-list instagram-style">
                              {likedMessages.map((message) => (
                                <div key={message.id} className="user-message-item facebook-style">
                                  <div className="message-header">
                                    {message.author?.profilePicture ? (
                                      <img 
                                        src={message.author.profilePicture} 
                                        alt={`${message.author.username}'s avatar`}
                                        className="message-avatar"
                                        onError={(e) => {
                                          // Use the same approach as for profile avatar
                                          const username = message.author.username;
                                          const parent = e.target.parentNode;
                                          // Render AvatarPlaceholder directly instead of hiding
                                          const placeholderComponent = document.createElement('div');
                                          placeholderComponent.className = 'avatar-placeholder message-avatar';
                                          
                                          // Same helper functions as in profile avatar
                                          function getInitials(name) {
                                            if (!name) return '?';
                                            const parts = name.split(/[\s_.-]+/);
                                            if (parts.length === 1) {
                                              return name.substring(0, 2).toUpperCase();
                                            } else {
                                              return (parts[0][0] + parts[Math.min(parts.length - 1, 1)][0]).toUpperCase();
                                            }
                                          }
                                          
                                          function getBackgroundColor(name) {
                                            if (!name) return '#6c757d';
                                            const hash = name.split('').reduce(
                                              (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
                                            );
                                            const colors = [
                                              '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', 
                                              '#DB2777', '#4338CA', '#059669', '#0891B2', '#EA580C'
                                            ];
                                            return colors[Math.abs(hash) % colors.length];
                                          }
                                          
                                          placeholderComponent.style.backgroundColor = getBackgroundColor(username);
                                          placeholderComponent.style.width = '40px';
                                          placeholderComponent.style.height = '40px';
                                          placeholderComponent.style.display = 'flex';
                                          placeholderComponent.style.alignItems = 'center';
                                          placeholderComponent.style.justifyContent = 'center';
                                          placeholderComponent.style.color = '#fff';
                                          placeholderComponent.style.fontSize = '16px';
                                          placeholderComponent.style.fontWeight = 'bold';
                                          placeholderComponent.style.borderRadius = '50%';
                                          placeholderComponent.style.textTransform = 'uppercase';
                                          
                                          placeholderComponent.innerText = getInitials(username);
                                          parent.replaceChild(placeholderComponent, e.target);
                                        }}
                                      />
                                    ) : (
                                      <AvatarPlaceholder 
                                        username={message.author.username} 
                                        size="40px" 
                                        className="message-avatar"
                                      />
                                    )}
                                    <div className="message-author-info">
                                      <span 
                                        className="message-author"
                                        onClick={() => navigate(`/profile/${message.author.username}`)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {message.author.username}
                                      </span>
                                    </div>
                                    <span className="message-timestamp-right">{timeAgo(message.createdAt)}</span>
                                  </div>
                                  <div className="message-content-square">
                                    {message.image && (
                                      <img src={message.image} alt="Message" className="message-image" />
                                    )}
                                    <p className="message-text-bold">{message.text}</p>
                                  </div>
                                  <div className="message-actions">
                                    <div className="likes-count">
                                      <GoHeartFill className={`heart-icon ${message.likedByCurrentUser || (isCurrentUser && activeTab === 'likes') ? 'liked-by-user' : ''}`} /> {message.likesCount || 0}
                                    </div>
                                    {message.location && message.location.latitude && message.location.longitude ? (
                                      <button 
                                        className="location-button"
                                        onClick={() => alert(`Location: ${message.location.latitude.toFixed(6)}, ${message.location.longitude.toFixed(6)}`)}
                                      >
                                        <GoLocation className="location-icon" /> View Location
                                      </button>
                                    ) : (
                                      <div className="location-placeholder"></div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {hasMoreLikedMessages && (
                              <div className="load-more-container">
                                <button 
                                  className="load-more-button" 
                                  onClick={handleLoadMoreLikedMessages}
                                  disabled={isLoadingMoreLikedMessages}
                                >
                                  {isLoadingMoreLikedMessages ? 'Loading...' : 'Load More Likes'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Edit mode
                <div className="profile-form">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Tell us about yourself"
                        rows="3"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="profilePicture">Profile Picture URL</label>
                      <input
                        type="text"
                        id="profilePicture"
                        name="profilePicture"
                        value={formData.profilePicture}
                        onChange={handleChange}
                        placeholder="https://example.com/your-image.jpg"
                      />
                      
                      {formData.profilePicture && (
                        <img 
                          src={formData.profilePicture} 
                          alt="Profile preview" 
                          className="profile-preview"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="coverColor">Profile Cover Color</label>
                      <div className="color-picker-container">
                        <input
                          type="color"
                          id="coverColor"
                          name="coverColor"
                          value={formData.coverColor}
                          onChange={handleChange}
                          className="color-picker"
                        />
                        <span className="color-value">{formData.coverColor}</span>
                      </div>
                      
                      <div className="color-palette">
                        {profileCoverColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`color-swatch ${formData.coverColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData({ ...formData, coverColor: color })}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                      
                      <div className="cover-preview" style={{ backgroundColor: formData.coverColor }}>
                        <span>Cover Preview</span>
                      </div>
                    </div>
                    
                    <div className="profile-settings-section">
                      <h3>Account Settings</h3>
                      
                      <div className="profile-setting-item">
                        <span className="setting-label">Dark Mode</span>
                        <div className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={formData.darkMode}
                            onChange={handleToggleDarkMode}
                            id="darkModeToggle"
                          />
                          <label htmlFor="darkModeToggle" className="toggle-label">
                            <span className="toggle-icon">
                              {formData.darkMode ? <GoMoon /> : <GoSun />}
                            </span>
                            <span className="toggle-text">
                              {formData.darkMode ? 'Dark Mode' : 'Light Mode'}
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="profile-setting-item">
                        <span className="setting-label">Notifications</span>
                        {notificationEnabled ? (
                          <button 
                            className="setting-action-btn notification-enabled" 
                            onClick={showNotificationDisableInstructions}
                            aria-label="Disable notifications"
                          >
                            <GoBell className="setting-icon" /> Disable in Browser
                          </button>
                        ) : (
                          <div className="notification-controls">
                            <div className="notification-badge disabled">
                              <GoBellSlash className="badge-icon" />
                              <GoInfo className="badge-status-icon" />
                              <span className="badge-text">Browser Disabled</span>
                            </div>
                            <button 
                              className="setting-action-btn" 
                              onClick={requestNotificationPermission}
                              aria-label="Enable notifications"
                            >
                              <GoBell className="setting-icon" /> Enable in Browser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="profile-form-actions">
                      <button type="button" className="cancel-button" onClick={handleCancel}>
                        Cancel
                      </button>
                      <button type="submit" className="save-button">
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

ProfilePage.propTypes = {
  user: PropTypes.object,
  onlineUsers: PropTypes.object,
  isDarkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func
};

export default ProfilePage; 