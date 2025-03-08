import React from 'react';
import PropTypes from 'prop-types';
import './styles.css';

/**
 * A component that generates a colored avatar with the user's initials
 * when no profile picture is available
 */
const AvatarPlaceholder = ({ username, size, className, onClick, style }) => {
  // Generate initials from username (up to 2 characters)
  const getInitials = (name) => {
    if (!name) return '?';
    
    // Split by spaces, dashes, underscores, and dots
    const parts = name.split(/[\s_.-]+/);
    
    if (parts.length === 1) {
      // If only one part, take first two characters
      return name.substring(0, 2).toUpperCase();
    } else {
      // If multiple parts, take first character of first two parts
      return (parts[0][0] + parts[Math.min(parts.length - 1, 1)][0]).toUpperCase();
    }
  };

  // Generate a deterministic color based on username
  const getBackgroundColor = (name) => {
    if (!name) return '#6c757d'; // Default gray
    
    // Simple hash function for the username
    const hash = name.split('').reduce(
      (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0
    );
    
    // List of pleasant background colors
    const colors = [
      '#2563EB', // Blue
      '#059669', // Green
      '#DC2626', // Red
      '#D97706', // Amber
      '#7C3AED', // Purple
      '#DB2777', // Pink
      '#4338CA', // Indigo
      '#059669', // Emerald
      '#0891B2', // Cyan
      '#EA580C', // Orange
    ];
    
    // Pick a color based on the hash
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(username);
  const bgColor = getBackgroundColor(username);
  
  // Apply inline styles and the given className
  const avatarStyle = {
    backgroundColor: bgColor,
    width: size,
    height: size,
    fontSize: `${Math.max(parseInt(size) / 2.5, 12)}px`,
    ...style // Merge any additional styles passed as props
  };

  return (
    <div 
      className={`avatar-placeholder ${className || ''}`} 
      style={avatarStyle}
      title={username}
      onClick={onClick}
    >
      {initials}
    </div>
  );
};

AvatarPlaceholder.propTypes = {
  username: PropTypes.string.isRequired,
  size: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func,
  style: PropTypes.object
};

AvatarPlaceholder.defaultProps = {
  size: '40px',
  className: '',
  style: {}
};

export default AvatarPlaceholder; 