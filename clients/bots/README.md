# Bot Server

This is a standalone server that manages and communicates with bots for the Gringo platform.

## Directory Structure

The bot server code is organized as follows:

```
clients/bots/
├── config/               # Configuration settings
│   └── index.js          # Main configuration file
├── middleware/           # Express middleware
│   ├── index.js          # Main middleware exports
│   └── rateLimiter.js    # Rate limiting middleware
├── routes/               # API routes
│   ├── bots.js           # Bot management routes
│   ├── health.js         # Health check routes
│   ├── index.js          # Routes aggregator
│   └── messages.js       # Message handling routes
├── templates/            # Bot templates
│   ├── news.js           # News bot template
│   ├── weather.js        # Weather bot template
│   └── index.js          # Templates registration
├── utils/                # Utility functions
│   ├── index.js          # Utilities aggregator
│   └── logger.js         # Logging utility
├── botFactory/           # Bot factory module (modularized)
│   ├── index.js          # Main entry point (exports singleton)
│   ├── BotFactory.js     # Main factory class
│   ├── templateManager.js # Template management methods
│   ├── botAccess.js      # Bot access methods
│   ├── botLifecycle.js   # Bot lifecycle methods
│   └── helpers.js        # Helper methods and utilities
└── server.js             # Main server entry point
```

## Components

### Server

The main server file (`server.js`) directly starts the bot server and serves as the primary entry point:

- Sets up the Express app
- Initializes the BotFactory
- Registers middleware and routes
- Handles process termination signals
- Starts the server

### Configuration

The configuration file (`config/index.js`) centralizes all environment variables and settings:

- Server port
- Main server URL
- API keys
- CORS settings
- Rate limits
- Log level

### API Keys

#### NewsData.io API
The News Bot requires a NewsData.io API key to fetch real-time breaking news. This is now the only data source for the News Bot, as mock data has been removed.

To set up:

1. Register for an API key at [https://newsdata.io/register](https://newsdata.io/register)
2. Add the key to your environment variables:
   ```
   NEWSDATA_API_KEY=your_api_key_here
   ```
3. Alternatively, update the key directly in `templates/news.js` (not recommended for production)

### Middleware

Middleware components (`middleware/`) handle common request processing:

- Rate limiting
- API key validation
- Error handling
- Request logging

### Routes

API routes (`routes/`) are organized by functionality:

- Bot management (registration, listing, details, shutdown)
- Message handling (sending and receiving)
- Health checks and diagnostics

### BotFactory

The BotFactory (`botFactory/`) is a modular implementation of the bot management system:

- **index.js**: Creates and exports a singleton instance of the BotFactory
- **BotFactory.js**: Main class that orchestrates all bot management operations
- **templateManager.js**: Handles registration and retrieval of bot templates
- **botAccess.js**: Provides methods for accessing bot instances
- **botLifecycle.js**: Manages bot initialization and shutdown
- **helpers.js**: Contains utility methods used by the other modules

### Templates

Bot templates (`templates/`) define the structure and behavior of different bot types:

- Each template is defined in its own file (e.g., `news.js`, `weather.js`)
- Templates are loaded dynamically by the `templates/index.js` registration module
- Template names are derived from their file names (e.g., `news.js` becomes the "news" template)
- New templates can be added by simply creating new files in the templates directory

Available bot templates:
- News Bot: Provides real-time breaking news updates from NewsData.io API with advanced features. Gets recent news (last 6 hours) with images from multiple countries (rotating through 206 countries in groups of 5), removes duplicates, and only posts messages with valid location coordinates. Content is truncated to 120 characters (excluding URLs) and images are downloaded and uploaded as file attachments.
- Weather Bot: Provides weather information

### Utilities

Utility functions (`utils/`) provide common functionality:

- Logging
- Error handling
- Helper methods

## Creating Custom Bot Templates

To add a new bot template:

1. Create a new file in the `templates/` directory (e.g., `mybot.js`)
2. Export an object with the following structure:
   ```javascript
   module.exports = {
     name: 'My Bot',
     description: 'Description of my bot',
     initialize: async (botData) => {
       // Return a bot instance
       return {
         _id: botData._id,
         type: 'mybot',
         username: botData.username || 'MyBot',
         // ... define bot methods ...
         processMessage: async (message) => { /* ... */ },
         sendMessage: async (content, recipient) => { /* ... */ },
         shutdown: async () => { /* ... */ }
       };
     }
   };
   ```
3. The template will be automatically registered with the name matching its filename

## Usage

To start the bot server:

```bash
node clients/bots/server.js
```

Or using npm scripts:

```bash
cd clients/bots
npm start
```

For development with auto-restart:

```bash
cd clients/bots
npm run dev
```

## API Endpoints

### Bot Management

- `GET /api/bots` - List all active bots
- `GET /api/bots/:id` - Get a specific bot
- `POST /api/bots/register` - Register a new bot
- `DELETE /api/bots/:id` - Shutdown and remove a bot
- `GET /api/bots/templates` - List available bot templates

### Messages

- `POST /api/messages/receive` - Receive a message for a bot
- `POST /api/messages/send` - Send a message from a bot

### Health and Diagnostics

- `GET /health` - Server health check
- `GET /api/test-connection` - Test connection to main server 