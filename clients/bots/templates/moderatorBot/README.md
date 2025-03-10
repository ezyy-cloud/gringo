# Moderator Bot

A bot that helps moderate content and conversations on the platform using advanced NLP techniques.

## Features

- Uses the compromise NLP library to detect vulgar content, profanity, and hate speech
- Automatically deletes messages that violate community guidelines
- Identifies potential spam messages
- Provides content warnings for sensitive topics
- Responds to moderation commands
- Connects to the platform via Socket.IO for real-time moderation
- Broadcasts moderation notifications to all users

## Files

- `index.js` - Main bot template configuration and initialization with socket connection
- `moderationService.js` - Provides content moderation functionality using compromise NLP
- `messageHandler.js` - Processes incoming messages and commands, handles message deletion

## Configuration

The moderator bot accepts the following configuration parameters:

```javascript
{
  profanityFilter: true,     // Filter and detect profanity using NLP
  spamDetection: true,       // Detect potential spam
  contentWarnings: true,     // Add warnings for sensitive content
  autoModeration: true       // Automatically delete content that violates guidelines
}
```

## Commands

The moderator bot responds to the following commands:

- `/report [content]` - Report content for moderator review
- `/mod settings` - View current moderation settings

## Implementation Details

### NLP-Based Content Moderation

The bot uses the compromise NLP library to analyze message content for:

1. **Vulgar Language**: Detects profanity and vulgar terms
2. **Hate Speech**: Identifies slurs and hateful content
3. **Sexual Content**: Detects explicit sexual references
4. **Sensitive Topics**: Identifies content related to violence, politics, drugs, etc.

### Message Deletion Process

When a message is flagged for deletion:

1. The bot detects the violation using NLP analysis
2. It calls the server API to delete the message
3. It notifies the sender about the violation
4. It broadcasts a general notification about the moderation action

### Socket.IO Integration

The bot connects to the platform's Socket.IO server to:

1. Listen for all messages in real-time
2. Process messages through its moderation pipeline
3. Send notifications and responses
4. Delete violating messages via API calls

## Environment Variables

- `SOCKET_URL` - URL of the Socket.IO server (default: http://localhost:3000)
- `API_BASE_URL` - Base URL for API calls (default: http://localhost:3000/api)
- `BOT_API_KEY` - API key for authentication
- `BOT_TOKEN` - JWT token for socket authentication

## Dependencies

- compromise - NLP library for content analysis
- socket.io-client - For real-time communication
- axios - For making HTTP requests to the API

## Server Integration

This bot uses the following capabilities registered with the server:
- `messaging` - For sending and receiving messages
- `moderation` - For content moderation actions
- `content-analysis` - For analyzing message content 