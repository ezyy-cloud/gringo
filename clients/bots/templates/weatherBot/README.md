# Weather Bot

A bot that provides real-time weather alerts for severe weather conditions using the OpenWeatherMap Global Weather Alerts API.

## Features

- Receives weather alerts through a webhook at `/api/weather/alerts`
- Processes and formats alerts with appropriate icons based on alert type
- Filters alerts based on severity threshold
- In-memory tracking of processed alerts to prevent duplicates
- Simple webhook-based architecture with no database dependencies

## Installation

No additional installation is needed beyond the main application dependencies. The Weather Bot is integrated into the main application.

## Configuration

The bot can be configured with the following options:

- `apiKey`: OpenWeatherMap API key
- `minSeverity`: Minimum severity level to report (Extreme, Severe, Moderate, Minor, Unknown)
- `debugMode`: Enable debug mode for testing

## Usage

The Weather Bot works in webhook mode only. It receives alerts directly from OpenWeatherMap's Global Weather Alerts push service.

### Webhook Mode Setup

1. Subscribe to OpenWeatherMap's Global Weather Alerts service
2. Configure your subscription to send alerts to your server's `/api/weather/alerts` endpoint
3. The bot will process incoming alerts and publish them to the platform

## Alert Structure

The bot expects incoming alerts in the following format:

```json
{
  "alert": {
    "id": "unique-alert-id",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
    }
  },
  "msg_type": "warning",
  "categories": ["Met"],
  "urgency": "Expected",
  "severity": "Moderate",
  "certainty": "Likely",
  "start": 1646739000,
  "end": 1646824080,
  "sender": "NWS Charleston (West Virginia)",
  "description": [
    {
      "language": "En",
      "event": "Flood Warning",
      "headline": "Flood Warning issued...",
      "description": "...FLOOD WARNING NOW IN EFFECT...",
      "instruction": "Turn around, don't drown..."
    }
  ]
}
```

## Icons

The bot automatically assigns appropriate icons to different types of weather alerts to make them more visually identifiable:

- 🌪️ Tornado warnings
- ⛈️ Thunderstorm alerts
- 🌊 Flood warnings
- ❄️ Winter storm alerts
- 🔥 Heat/fire warnings
- And many more...

## Development & Testing

For testing purposes, use the mock alert endpoint:

```
POST /api/weather/mock-alert
```

This will generate a random weather alert for a location and process it through the system.

## Memory Management

Processed alerts are stored in memory to prevent duplicate processing. This is implemented using a Set data structure for efficient lookups.

## API Endpoints

- `POST /api/weather/alerts`: Main webhook endpoint for receiving alerts
- `POST /api/weather/mock-alert`: Generate and process a mock alert (development only)

## Integration with Main Application

The Weather Bot connects to the main application through the webhook router and the standard bot initialization process. When the application starts, it initializes the bot with the appropriate configuration. 