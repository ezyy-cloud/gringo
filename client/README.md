# GringoX Client

A modern React frontend for the GringoX social networking application with real-time communication capabilities, responsive design, and interactive user interface.

## Features

- **Modern React Architecture**: Built with React 19 and Vite for optimal performance
- **Real-Time Communication**: Socket.IO integration for instant messaging and notifications
- **Responsive Design**: Adapts seamlessly to mobile, tablet, and desktop viewports
- **User Authentication**: Secure login, registration, and session management
- **User Profiles**: View and interact with user profiles
- **Social Networking**: Follow/unfollow users, view connections
- **Messaging System**: Real-time private messaging between users
- **Location Features**: MapBox/React-Map-GL integration for location-based functionality
- **Beautiful UI**: Modern user interface with intuitive navigation

## Technologies

- React 19
- Vite 6 (for fast development and optimized builds)
- React Router 6 (for navigation)
- Socket.IO Client (for real-time features)
- Axios (for API requests)
- React Icons (for UI elements)
- React-Map-GL/MapBox (for maps and location features)
- PropTypes (for type checking)

## Project Structure

```
client/
├── public/           # Static assets and public files
├── src/              # Source code
│   ├── components/   # React components
│   │   ├── auth/     # Authentication-related components
│   │   ├── layout/   # Layout components
│   │   ├── ui/       # UI components
│   │   └── ...       # Other component categories
│   ├── services/     # Services for external communication
│   │   ├── api.js    # API service for REST endpoints
│   │   └── socket.js # Socket.IO service for real-time communication
│   ├── utils/        # Utility functions
│   ├── assets/       # Images, icons, and other assets
│   ├── App.jsx       # Main application component
│   ├── App.css       # Main application styles
│   ├── main.jsx      # Application entry point
│   └── index.css     # Global styles
├── index.html        # HTML entry point
├── vite.config.js    # Vite configuration
└── package.json      # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Install dependencies:
   ```
   npm install
   ```

### Development

Start the development server:
```
npm run dev
```

The application will be available at http://localhost:5173

### Building for Production

Create a production build:
```
npm run build
```

The build output will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:
```
npm run preview
```

Or serve on a specific port:
```
npm run serve
```

## Key Components

### Authentication
- Login and registration forms
- Protected routes for authenticated users
- User session management

### Navigation
- Main navigation bar
- Mobile-responsive menu
- User profile navigation

### Social Features
- User profile display
- Follow/unfollow functionality
- Followers and following lists
- User search

### Messaging
- Real-time chat interface
- Message history loading
- Typing indicators
- Read receipts

### Maps and Location
- Interactive maps using MapBox/React-Map-GL
- Location sharing
- Geospatial features

## Server Integration

The client communicates with the server through:

1. **HTTP/REST API**: 
   - Uses Axios for API requests
   - Handles authentication, data fetching, and updates

2. **WebSockets/Socket.IO**:
   - Real-time bidirectional communication
   - Instant messaging and notifications
   - Online status updates

## Environment Variables

To customize the client configuration, you can create a `.env` file with:

```
VITE_API_URL=http://localhost:3000           # Backend API URL
VITE_SOCKET_URL=http://localhost:3000        # Socket.IO server URL
VITE_MAPBOX_TOKEN=your_mapbox_token          # Optional: MapBox API token
```

## Browser Compatibility

The application is tested and optimized for:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)
