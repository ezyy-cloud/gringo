/**
 * News Bot - Content Formatter
 * Handles formatting news content for posting
 */
const { logger } = require('../../utils');

/**
 * Format news content for posting
 * @param {Object} newsItem - News item to format
 * @param {Object} config - Bot configuration
 * @returns {string} - Formatted content
 */
function formatNewsContent(newsItem, config) {
  try {
    // Start with the title
    let content = newsItem.title;
    
    // Add description if needed, truncating to the specified length
    if (newsItem.description) {
      const maxLength = config.contentMaxLength || 120;
      const truncatedDescription = truncateWithoutBreakingUrls(
        newsItem.description, 
        maxLength - newsItem.title.length - 3 // account for the newline and spaces
      );
      
      if (truncatedDescription.length > 0) {
        content += `\n\n${truncatedDescription}`;
      }
    }
    
    // Add source attribution
    if (newsItem.source_id) {
      content += `\n\nSource: ${newsItem.source_id}`;
    }
    
    // Add the link at the end if not already included
    if (newsItem.link && !content.includes(newsItem.link)) {
      content += `\n\n${newsItem.link}`;
    }
    
    return content;
  } catch (error) {
    logger.error(`Error formatting news content: ${newsItem.title}`, error);
    // Return a simple fallback if there's an error
    return `${newsItem.title}\n\n${newsItem.link || ''}`;
  }
}

/**
 * Truncate text without breaking URLs
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateWithoutBreakingUrls(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Extract URLs from the text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push({
      url: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  // If there are no URLs, just do a regular truncation
  if (urls.length === 0) {
    return text.substring(0, maxLength) + '...';
  }
  
  // Keep track of characters we're counting towards the limit
  let effectiveLength = 0;
  let truncationIndex = 0;
  
  for (let i = 0; i < text.length; i++) {
    // Check if this character is part of a URL
    const isInUrl = urls.some(url => i >= url.startIndex && i < url.endIndex);
    
    // Only count characters not in URLs towards the length limit
    if (!isInUrl) {
      effectiveLength++;
    }
    
    // Update the truncation index
    truncationIndex = i;
    
    // If we've reached the max length, stop
    if (effectiveLength >= maxLength) {
      break;
    }
  }
  
  // Make sure we don't cut in the middle of a URL
  let finalTruncationIndex = truncationIndex;
  const partialUrl = urls.find(
    url => truncationIndex >= url.startIndex && truncationIndex < url.endIndex
  );
  
  if (partialUrl) {
    // If we're in the middle of a URL, include the whole URL
    finalTruncationIndex = partialUrl.endIndex;
  }
  
  return text.substring(0, finalTruncationIndex + 1) + '...';
}

module.exports = {
  formatNewsContent
}; 