import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoChevronLeft, GoKebabHorizontal, GoPerson, GoSignOut } from "react-icons/go";
import PropTypes from 'prop-types';
import NotificationBell from '../NotificationBell';
import './styles.css';

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

export default NavigationHeader; 