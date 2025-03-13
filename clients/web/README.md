# GringoX Web Client

The web client for the GringoX social networking application. This React application includes real-time functionality with Socket.IO and interactive maps with Mapbox GL JS.

## Mapbox GL JS v3 Implementation

This application uses Mapbox GL JS v3, which provides enhanced mapping capabilities including:

### Key Features

- **Mapbox Standard Style**: A realistic 3D lighting system with building shadows and visual enhancements
- **Automatic Time-Based Lighting**: Lighting automatically adjusts based on the real time at the map's viewport location
- **3D Buildings and Landmarks**: Enhanced 3D models for landmarks and buildings
- **Layer Slots**: Proper organization of custom data layers
- **Heatmap Visualization**: Show message density using heatmap (custom layer example)

### Map Controls

The map interface provides several controls:

- **3D Toggle**: Switch between 2D and 3D viewing modes
- **Heatmap Toggle**: Show/hide the message density heatmap
- **User Location**: Center the map on your current location
- **Reset View**: Return to the default map view
- **Light Indicator**: Displays the current light preset (day, dawn, dusk, or night)

### Automatic Light Preset

The map automatically adjusts the lighting based on the time of day at the current viewport location:

- Calculates sunrise and sunset times based on the map's latitude and current date
- Adjusts for seasonal variations (days are longer in summer, shorter in winter)
- Changes lighting presets in real time as the day progresses
- Updates when you move the map to locations in different time zones

```javascript
// Get the appropriate light preset for a specific time and latitude
const preset = getLightPresetForTime(new Date(), latitude);
// Returns 'dawn', 'day', 'dusk', or 'night'

// Apply the light preset to the map
map.setConfigProperty('basemap', 'lightPreset', preset);
```

### Configuration Properties

The Mapbox Standard style is configured with the following properties:

```javascript
// Enable/disable 3D objects
map.setConfigProperty('basemap', 'show3dObjects', true);

// Change light preset (automatically set based on viewport time)
map.setConfigProperty('basemap', 'lightPreset', preset);
```

### Layer Slots

Custom layers are added to specific slots in the layer stack:

```javascript
// Add custom layer in the middle slot (above roads but below labels)
const customLayer = {
  id: 'custom-layer',
  type: 'fill',
  slot: 'middle', // Can be: bottom, middle, or top
  source: 'source-id',
  paint: {
    // Paint properties...
  }
};
```

## Development Setup

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Mapbox API token

### Installation

1. Clone the repository
2. Navigate to the client directory: `cd clients/web`
3. Install dependencies: `npm install`
4. Create a `.env` file with your Mapbox token:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```
5. Start the development server: `npm run dev`

## Building and Deployment

To build the application for production:

```
npm run build
```

This will generate optimized assets in the `dist` directory, which can be deployed to a static hosting service.

## Learn More

For more information about Mapbox GL JS v3, visit:
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Standard Style Configuration](https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/)

## Features

- Real-time messaging and location sharing
- Interactive map view with message pins
- User profiles and authentication
- 3D mapping capabilities for enhanced visualization
- Weather widget showing local conditions
- Dark/light mode support

## 3D Map Features

The application now includes a 3D mode for enhanced map visualization:

### How to Use 3D Mode

1. Click the stack icon (layers) in the bottom right corner of the map to toggle 3D mode
2. In 3D mode, buildings will appear extruded from the map
3. Use standard map controls to navigate:
   - Scroll to zoom in/out
   - Drag to pan
   - Right-click and drag (or two-finger drag) to rotate the 3D view

### 3D Mode Features

- Real 3D buildings with proper lighting and shadows
- 3D message markers that represent user posts
- Smooth transitions between 2D and 3D modes
- Optimized performance with Three.js rendering
- Dark mode support for 3D elements
- Fully responsive design that adapts to any screen size

## Development

### Prerequisites

- Node.js 18+ recommended
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Technologies Used

- React 19
- Vite 6
- Three.js for 3D rendering
- Mapbox GL for mapping
- Socket.IO for real-time communication

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request
