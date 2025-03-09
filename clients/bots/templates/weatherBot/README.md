# Weather Bot

A bot that provides weather information for locations mentioned in natural language.

## Features

- Extracts location names from user queries using Compromise.js natural language processing
- Geocodes locations to coordinates using OpenStreetMap
- Provides current weather conditions, temperature, humidity, and forecast
- Responds to weather queries in natural language

## Files

- `index.js` - Main bot template configuration and initialization
- `weatherService.js` - Handles fetching weather data for locations
- `messageHandler.js` - Processes incoming messages and responds to queries

## Configuration

The weather bot accepts the following configuration parameters:

```javascript
{
  weatherApiKey: "your-api-key", // For real weather API integration
  defaultUnits: "imperial",      // imperial or metric
  debugMode: false               // Enable debug mode
}
```

## Example Usage

When the bot receives messages, it will analyze them for weather-related queries:

User: "What's the weather like in Tokyo?"
Bot: "The weather in Tokyo is currently partly cloudy with a temperature of 65°F. Humidity is 45% with wind speed of 10 mph. Similar conditions expected for the next few days."

User: "Will it rain in New York tomorrow?"
Bot: "The weather in New York is currently cloudy with a temperature of 58°F. Humidity is 75% with wind speed of 8 mph. Similar conditions expected for the next few days."

## Implementation Notes

Currently, the bot uses a mock weather service. For production implementation, connect to a real weather API such as OpenWeatherMap. 