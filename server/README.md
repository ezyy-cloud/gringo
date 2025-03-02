# Gringo Server

The backend server component of the Gringo social networking application, built with Express, MongoDB, and Socket.IO for real-time communication.

## Features

- **Authentication System**: JWT-based authentication with secure password hashing
- **RESTful API**: Comprehensive API endpoints for user management and messaging
- **Real-time Communication**: Socket.IO integration for instant messaging and notifications
- **Database Integration**: MongoDB with Mongoose ODM for data persistence
- **Middleware Support**: Custom middleware for authentication and request processing
- **CORS Handling**: Cross-origin request support for frontend integration
- **Environment Configuration**: Dotenv for flexible configuration
- **User Management**: Complete user profile system with followers/following functionality

## Technologies

- Node.js
- Express.js
- Socket.IO
- MongoDB/Mongoose
- JSON Web Tokens (JWT)
- bcrypt
- nodemailer (for email functionality)
- cookie-parser (for JWT cookie handling)

## Project Structure

```
server/
├── controllers/   # Request handlers for API endpoints
├── middleware/    # Express middleware (auth, validation, etc.)
├── models/        # Mongoose schemas and models
│   ├── User.js    # User model with authentication methods
│   └── Message.js # Message model for chat functionality
├── routes/        # API route definitions
│   ├── authRoutes.js # Authentication routes
│   └── ...        # Other route files
├── utils/         # Utility functions and helpers
├── server.js      # Main server file with Express and Socket.IO setup
├── .env           # Environment variables configuration
└── package.json   # Dependencies and scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate user and issue JWT token
- `POST /api/auth/logout` - Clear authentication cookie
- `GET /api/auth/verify` - Verify JWT token and user session

### User Management
- `GET /api/users/:username` - Get user profile information
- `POST /api/users/:username/follow` - Follow a user
- `POST /api/users/:username/unfollow` - Unfollow a user

### Messaging
- `GET /api/messages` - Get message history (with pagination)
- `POST /api/messages` - Send a new message

## Socket.IO Events

### Server Events (emitted by the server)
- `userOnline` - Notifies clients when a user comes online
- `userOffline` - Notifies clients when a user goes offline
- `receiveMessage` - Delivers a message to the recipient
- `typing` - Indicates a user is typing a message

### Client Events (listened for by the server)
- `connection` - New socket connection
- `disconnect` - Socket disconnection
- `setUsername` - Associate socket with a username
- `sendMessage` - User sends a message
- `startTyping` - User starts typing
- `stopTyping` - User stops typing

## Environment Variables

The server requires the following environment variables:

```
PORT=3000                    # Server port
NODE_ENV=development         # Environment (development/production)
MONGODB_URI=<connection_url> # MongoDB connection string
JWT_SECRET=<secret_key>      # Secret for JWT signing
JWT_EXPIRES_IN=7d            # JWT expiration time
COOKIE_SECRET=<cookie_secret> # Cookie signing secret
```

## Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the required environment variables

## Running the Server

### Development Mode
```
npm run dev
```
This starts the server with nodemon for automatic reloading during development.

### Production Mode
```
npm start
```

## Integration with Client

The server is designed to work with the React client located in the `client/` directory. The server:

- Serves the API endpoints the client consumes
- Establishes WebSocket connections for real-time features
- Handles authentication and data persistence

## Database Schema

### User Model
- Username, email, password (hashed)
- Profile information
- Followers and following collections
- Authentication methods

### Message Model
- Sender and recipient
- Message content
- Timestamp and read status
- Associated metadata 