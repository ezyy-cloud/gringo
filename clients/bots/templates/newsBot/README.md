# News Bot

A streamlined bot that monitors news sources and posts breaking news updates to the platform. This bot operates on a scheduled basis and does not respond to user messages.

## Features

- Fetches breaking news from NewsData.io API with advanced filtering
- **Rotates through all 206 countries** to provide truly global news coverage
- Gets only news with images from the last 6 hours
- Extracts and geocodes location information from news articles
- Only posts news items that have valid location coordinates
- Downloads images from URLs and posts them as file attachments
- Truncates content to 120 characters without counting URLs in the limit

## Files

- `index.js` - Main bot template configuration and initialization
- `newsService.js` - Handles fetching news from the NewsData.io API
- `locationService.js` - Extracts and geocodes locations from news articles
- `newsFormatter.js` - Formats news content for posting
- `newsPublisher.js` - Handles posting news items to the platform

## Configuration

The news bot accepts the following configuration parameters:

```javascript
{
  newsApiKey: "your-newsdata-api-key", // NewsData.io API key
  maxNewsItemsPerRun: 3,               // Number of news items to post per run
  minImageWidth: 300,                  // Minimum width for images 
  minImageHeight: 200,                 // Minimum height for images
  contentMaxLength: 120,               // Maximum content length
  postFrequency: 60,                   // Minutes between posts
  postWithLocation: true,              // Whether to include location data
  countries: "us,gb,ca,au,in,fr,de,jp", // Countries to source news from
  categories: "top,world",              // News categories
  language: "en",                       // News language
  requireLocation: false,               // Only post news with locations
  debugMode: false                      // Enable debug mode
}
```

## Using in Production

For production use, be sure to:
1. Set a valid NewsData.io API key in the bot configuration
2. Set the MAIN_SERVER_URL environment variable
3. Set the BOT_API_KEY environment variable 