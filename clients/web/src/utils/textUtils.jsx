import React from 'react';

/**
 * Text formatting utilities for the application
 */

/**
 * Converts URLs in text to clickable links
 * @param {string} text - The text to process
 * @returns {Array|string} - Array of React elements or original string if no links found
 */
export const renderTextWithLinks = (text) => {
  if (!text) return '';
  
  // Regular expression to match URLs
  // This matches:
  // 1. http:// and https:// prefixed URLs
  // 2. www. prefixed URLs
  // 3. bare domain URLs like example.com, ezyy.cloud, etc.
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*\b)/g;
  
  // If no URLs in the text, return the original text
  if (!urlRegex.test(text)) return text;
  
  // Reset regex lastIndex
  urlRegex.lastIndex = 0;
  
  // Split the text by URLs and create an array of text and link elements
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Get the matched URL
    const url = match[0];
    
    // Prepare proper URL by adding https:// prefix if needed
    let href;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      href = url;
    } else if (url.startsWith('www.')) {
      href = `https://${url}`;
    } else {
      // For bare domains like ezyy.cloud
      href = `https://${url}`;
    }
    
    // Enhanced click handler for links
    const handleLinkClick = (e) => {
      // Stop the click from bubbling up to parent elements
      e.stopPropagation();
      e.preventDefault();
      
      // Open the link in a new tab/window
      window.open(href, '_blank', 'noopener,noreferrer');
      
      // Return false to prevent any default behavior
      return false;
    };
    
    // Add the URL as a link with enhanced click handling
    parts.push(
      <a 
        key={match.index} 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="message-link"
        onClick={handleLinkClick}
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
      >
        {url}
      </a>
    );
    
    // Update lastIndex
    lastIndex = match.index + url.length;
  }
  
  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
};

/**
 * Detects and returns hashtags from text
 * @param {string} text - The text to process
 * @returns {string[]} - Array of hashtags found in the text
 */
export const extractHashtags = (text) => {
  if (!text) return [];
  
  // Match hashtags in the text
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  
  // Return empty array if no hashtags found
  if (!matches) return [];
  
  // Remove # from each hashtag and return the array
  return matches.map(tag => tag.substring(1));
};

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  
  // Truncate and add ellipsis
  return text.substring(0, maxLength) + '...';
};

export default {
  renderTextWithLinks,
  extractHashtags,
  truncateText
}; 