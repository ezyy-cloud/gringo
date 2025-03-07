# GringoX Web Client

This is the web client for the GringoX social networking application.

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
