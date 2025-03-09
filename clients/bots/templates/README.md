# Bot Templates

This directory contains templates for various bot types used in the GringoX platform.

## Directory Structure

- `newsBot/` - News bot implementation for fetching and posting news articles
- `weatherBot/` - Weather bot implementation for providing weather information
- `moderatorBot/` - Moderator bot implementation for content moderation
- `utilities/` - Shared utility functions used by multiple bot templates

## Adding a New Bot Template

1. Create a new directory with the naming convention `[botType]Bot/`
2. Create at minimum an `index.js` file that exports:
   - `name` - Bot display name
   - `description` - Bot description
   - `capabilities` - Array of bot capabilities
   - `initialize` - Function that initializes the bot

## Legacy Templates

For backward compatibility, the system still supports single-file templates in the root of this directory. However, new templates should use the folder-based structure.

## Using Templates

Templates are registered with the BotFactory upon server startup. To create a bot instance:

```javascript
const bot = await botFactory.createBot('news', {
  username: 'NewsBot',
  config: {
    // Bot-specific configuration
  }
});
``` 