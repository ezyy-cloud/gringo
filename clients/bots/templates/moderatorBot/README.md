# Moderator Bot

A bot that helps moderate content and conversations on the platform.

## Features

- Detects and filters profanity in messages
- Identifies potential spam messages
- Provides content warnings for sensitive topics
- Responds to moderation commands
- Can automatically reject certain content based on configuration

## Files

- `index.js` - Main bot template configuration and initialization
- `moderationService.js` - Provides content moderation functionality
- `messageHandler.js` - Processes incoming messages and commands

## Configuration

The moderator bot accepts the following configuration parameters:

```javascript
{
  profanityFilter: true,     // Filter and replace profanity
  spamDetection: true,       // Detect potential spam
  contentWarnings: true,     // Add warnings for sensitive content
  autoModeration: false      // Automatically reject content without human intervention
}
```

## Commands

The moderator bot responds to the following commands:

- `/report [content]` - Report content for moderator review
- `/mod settings` - View current moderation settings

## Implementation Notes

The profanity filter and spam detection currently use simple pattern matching. For production use, consider implementing more advanced detection mechanisms such as machine learning models. 