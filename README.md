# GringoX - Real-Time Social Networking Application

GringoX is a feature-rich real-time social networking application built with modern web technologies. It combines the power of Express.js, MongoDB, Socket.IO, and React to create a seamless social networking experience with real-time communication.

## Key Features

- **Real-Time Communication**: Socket.IO integration enables instant messaging and notifications
- **User Authentication**: Secure JWT-based authentication system with login/register functionality
- **User Profiles**: Customizable profiles with follower/following functionality
- **Social Network**: Follow/unfollow users, see user connections
- **Responsive UI**: Modern and responsive interface using React
- **API Integration**: RESTful API endpoints with Express
- **Database Storage**: MongoDB for persistent storage of users and messages

## Tech Stack

### Backend

- Node.js with Express.js
- Socket.IO for real-time bidirectional communication
- MongoDB with Mongoose for data storage
- JWT for secure authentication
- bcrypt for password hashing

### Frontend

- React (built with Vite)
- React Router for navigation
- Socket.IO Client for real-time communication
- Axios for API requests
- React Icons for UI elements
- MapBox/React-Map-GL for location-based features

## Project Structure

```plaintext
gringoX/
├── client/             # React frontend application
│   ├── src/            # Source code
│   │   ├── components/ # React components
│   │   ├── services/   # API and Socket services
│   │   ├── utils/      # Utility functions
│   │   └── App.jsx     # Main application component
│   ├── public/         # Static assets
│   └── package.json    # Client dependencies
│
├── server/             # Node.js backend
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Express middleware
│   ├── models/         # Mongoose data models
│   ├── routes/         # API route definitions
│   ├── utils/          # Server utilities
│   ├── server.js       # Main server file with Express and Socket.IO
│   └── package.json    # Server dependencies
│
└── package.json        # Root dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- MongoDB (local installation or cloud instance)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd gringoX
   ```

2. Install all dependencies (root, client, and server):

   ```bash
   npm run install-all
   ```

3. Configure environment variables:
   Create or update `.env` file in the server directory with:

   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

## Running the Application

### Start both client and server simultaneously

```bash
npm start
```

This will start both the client and server in development mode, with hot reloading enabled.

### Start server only

```bash
npm run server
```

### Start client only

```bash
npm run client
```

## Accessing the Application

- Client: <http://localhost:5173>
- Server API: <http://localhost:3000>
- API Documentation: <http://localhost:3000/api-docs> (if enabled)

## Features Overview

### Authentication

- Register new account
- Login with credentials
- JWT-based authentication
- Protected routes

### User Management

- View and edit user profiles
- Follow/unfollow users
- View followers and following lists

### Messaging

- Real-time messaging between users
- Message history
- Read receipts

### Notifications

- Real-time notifications
- Activity tracking

## API Endpoints

The server provides a comprehensive REST API. Key endpoints include:

- **Authentication**
  - POST `/api/auth/register` - Register a new user
  - POST `/api/auth/login` - Login a user

- **User Management**
  - GET `/api/users/:username` - Get user profile
  - POST `/api/users/:username/follow` - Follow a user
  - POST `/api/users/:username/unfollow` - Unfollow a user

- **Messaging**
  - GET `/api/messages` - Get message history
  - POST `/api/messages` - Send a message

For more details, refer to the server README or API documentation.

## Socket.IO Events

The application uses Socket.IO for real-time features. Key events include:

- `connection` - Client connects
- `disconnect` - Client disconnects
- `sendMessage` - Send a message
- `receiveMessage` - Receive a message
- `userOnline` - User comes online
- `userOffline` - User goes offline

## License

[ISC License]

## Contributors

- All contributors to this project
