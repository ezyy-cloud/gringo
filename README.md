# Gringo - Real-Time Geospatial Social Networking Application

Gringo is a modern, full-stack social networking application that combines real-time messaging, geolocation features, and user interactions. Built with a powerful tech stack including React, Express, MongoDB, and Socket.IO, it offers a seamless social networking experience for users.

## 🌟 Key Features

- **Real-Time Communication**: Instant messaging and notifications powered by Socket.IO
- **Geospatial Integration**: Location-based features using MapBox/React-Map-GL
- **Media Sharing**: Support for image uploading and sharing via Cloudinary
- **User Authentication**: Secure JWT-based authentication with password recovery
- **User Profiles**: Customizable profiles with profile pictures and bio information
- **Social Network**: Follow/unfollow functionality with user connections
- **Dark Mode**: User interface theme customization
- **Responsive Design**: Mobile-first approach for optimal user experience across devices
- **PWA Support**: Progressive Web App capabilities for offline use and installation
- **Redis Caching**: Performance optimization with Redis-based caching
- **Real-time Notifications**: Instant updates for user interactions
- **Image Capture**: In-app photo capture with react-webcam

## 🔧 Technology Stack

### Backend
- **Node.js** and **Express.js**: Server framework
- **Socket.IO**: Real-time bidirectional event-based communication
- **MongoDB** with **Mongoose**: Database and ORM
- **Redis**: Caching and Socket.IO scaling
- **JWT**: Secure authentication
- **bcrypt**: Password hashing
- **Cloudinary**: Cloud-based image management
- **Multer**: File upload handling
- **Nodemailer**: Email functionality for password reset

### Frontend
- **React** (built with Vite): UI framework
- **React Router**: Client-side routing
- **Socket.IO Client**: Real-time communication
- **React Icons**: UI elements
- **MapBox/React-Map-GL**: Interactive maps
- **React-Webcam**: In-app photo capture
- **PWA**: Progressive Web App capabilities

## 🏗️ Project Structure

```
gringo/
├── client/                 # React frontend application
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API and Socket services
│   │   ├── utils/          # Utility functions
│   │   ├── assets/         # Static assets
│   │   ├── App.jsx         # Main application component
│   │   └── App.css         # Application styles
│   ├── public/             # Static files
│   └── package.json        # Client dependencies
│
├── server/                 # Node.js backend
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose data models
│   │   ├── User.js         # User model
│   │   └── Message.js      # Message model
│   ├── routes/             # API route definitions
│   ├── utils/              # Server utilities
│   ├── server.js           # Main server file
│   └── package.json        # Server dependencies
│
└── package.json            # Root dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- MongoDB (local installation or cloud instance)
- Redis (optional, for enhanced performance)
- Cloudinary account (for image storage)

### Environment Setup

Create `.env` files in both client and server directories:

#### Server (.env)
```
PORT=3000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_SERVICE=your_email_service
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
```

#### Client (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your_mapbox_token
```

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gringo
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

## 🏃‍♂️ Running the Application

### Development Mode

Start both the client and server in development mode:

```bash
# In the root directory
npm run dev
```

Or start them separately:

```bash
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm run dev
```

### Production Mode

Build and start the application for production:

```bash
# Build client
cd client
npm run build
cd ..

# Start server in production mode
cd server
npm start
```

## 🌐 API Endpoints

### Authentication
- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login a user
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/reset-password` - Reset password with token

### User Management
- **GET** `/api/users/:username` - Get user profile
- **PUT** `/api/users/:username` - Update user profile
- **POST** `/api/users/:username/follow` - Follow a user
- **POST** `/api/users/:username/unfollow` - Unfollow a user
- **GET** `/api/users/:username/followers` - Get user followers
- **GET** `/api/users/:username/following` - Get users being followed

### Messages
- **GET** `/api/messages` - Get message feed
- **POST** `/api/messages` - Create a new message
- **POST** `/api/messages/:messageId/like` - Like a message
- **POST** `/api/messages/:messageId/unlike` - Unlike a message

## 🔌 Socket.IO Events

The application uses Socket.IO for real-time communication:

### Client Events (Emit)
- `connection` - Client connects to server
- `disconnect` - Client disconnects
- `sendMessage` - Send a new message
- `userOnline` - User comes online
- `userOffline` - User goes offline
- `typing` - User is typing
- `stopTyping` - User stopped typing

### Server Events (Listen)
- `receiveMessage` - Receive a new message
- `userJoined` - New user came online
- `userLeft` - User went offline
- `notification` - New notification
- `isTyping` - Someone is typing
- `stoppedTyping` - Someone stopped typing

## 🔄 Data Models

### User Model
- `username`: Unique identifier for the user
- `email`: User's email address
- `password`: Hashed password
- `profilePicture`: URL to user's profile image
- `coverColor`: User's profile theme color
- `bio`: Short user biography
- `isOnline`: Online status
- `darkMode`: UI theme preference
- `lastSeen`: Last activity timestamp
- `messages`: Array of message references
- `followers`: Array of user references
- `following`: Array of user references
- `likedMessages`: Array of liked message references

### Message Model
- `messageId`: Unique identifier for the message
- `text`: Message content
- `image`: Optional image URL
- `userId`: Reference to the sender
- `senderUsername`: Username of the sender
- `isApiMessage`: Flag for system messages
- `location`: Geolocation data (latitude/longitude)
- `likes`: Array of user references who liked the message
- `likesCount`: Number of likes
- `sequence`: Message ordering
- `createdAt`: Timestamp

## 🧩 Progressive Web App

Gringo is configured as a Progressive Web App, offering:
- Offline functionality
- Installation on home screen
- Fast loading
- App-like experience

## 📋 Development Guidelines

### Code Style
- Follow ESLint configuration
- Write self-documenting code with clear naming
- Include JSDoc comments for complex functions

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable

## 📱 Mobile Responsiveness

The application is designed with a mobile-first approach, ensuring optimal user experience across devices of all sizes:
- Responsive layout
- Touch-friendly interface
- Adaptive components

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting for API endpoints
- CORS protection
- Environment variable security
- Password reset functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- All contributors to the Gringo project
