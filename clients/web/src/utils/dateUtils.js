/**
 * Format a date object to a friendly time string (HH:MM)
 * @param {Date} time - Date object to format
 * @returns {string} Formatted time string
 */
export const formatTime = (time) => {
  if (!time) return 'unknown';
  return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Get a friendly relative time string from a date
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable time difference (e.g. "5 minutes ago")
 */
export const timeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const seconds = Math.floor((now - dateObj) / 1000);
  
  // Less than a minute
  if (seconds < 60) return 'just now';
  
  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  
  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  
  // Days
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  
  // Weeks
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  
  // Months
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  
  // Years
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format a date to a localized string based on user's timezone
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  // Default options
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat(navigator.language, defaultOptions).format(dateObj);
};

/**
 * Get the time component only from a date object
 * @param {Date|string} date - Date to extract time from
 * @returns {string} Time string in HH:MM format
 */
export const getTimeString = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleTimeString(navigator.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Get the date component only from a date object
 * @param {Date|string} date - Date to extract date from
 * @returns {string} Date string in user's locale format
 */
export const getDateString = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString(navigator.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default {
  formatTime,
  timeAgo,
  formatDate,
  getTimeString,
  getDateString
}; 