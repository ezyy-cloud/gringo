# Admin Dashboard

The Admin Dashboard provides a powerful interface for managing and monitoring the GringoX platform.

## Features

- User management
- Bot monitoring
- Message analytics
- Location heat map visualization
- System settings

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Mapbox access token to the `.env` file:

     ```
     VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
     ```

   - You can get a Mapbox access token by signing up at [mapbox.com](https://www.mapbox.com/)

3. Start the development server:

   ```bash
   npm run dev
   ```

## Location Heat Map

The dashboard includes a heat map visualization powered by Mapbox that shows user activity by geographic location. The heat map intensity represents the concentration of users in each area.

### Configuration

The heat map requires:

1. A valid Mapbox access token in the `.env` file
2. Location data with coordinates in the format:

   ```json
   {
     "name": "City Name",
     "count": 123,
     "coordinates": [longitude, latitude]
   }
   ```

If coordinates are not provided in the API response, the system will attempt to match location names with a predefined list of major cities.
