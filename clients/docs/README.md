# Gringo Documentation Application

This is the official documentation portal for the Gringo platform. It provides comprehensive guides and resources for developers, users, content creators, and businesses.

## Features

- **Comprehensive Documentation** - Detailed guides for all aspects of the platform
- **Developer Resources** - API documentation, SDKs, integration guides
- **User Guides** - Step-by-step instructions for platform users
- **Content Creator Resources** - Guides for creating engaging content
- **Business Documentation** - Advertising guides and business integration

## Tech Stack

- **React** - UI framework
- **Material UI** - Component library
- **react-router-dom** - Client-side routing
- **react-syntax-highlighter** - Code highlighting

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd gringo/clients/docs
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm start
   ```

The application will be available at http://localhost:3002

## Building for Production

To build the documentation app for production:

```bash
npm run build
```

This will create a `build` directory with optimized production files.

To serve the production build locally:

```bash
npx serve -s build
```

## Project Structure

```
docs/
├── public/          # Static files
├── src/             # Source code
│   ├── components/  # Reusable UI components
│   ├── pages/       # Documentation pages
│   ├── App.js       # Main application component
│   └── index.js     # Application entry point
├── package.json     # Dependencies and scripts
└── README.md        # Project documentation
```

## Adding New Documentation

1. Create a new file in the `src/pages/` directory
2. Import and add the new route in `src/components/Layout.js`
3. Add the new page to the appropriate section in the navigation menu

## Deployment

The documentation app can be deployed to any static hosting service:

1. Build the application
   ```bash
   npm run build
   ```

2. Deploy the contents of the `build` directory to your hosting provider

## License

This project is licensed under the terms specified in the repository's main license file.

## Contributing

Contributions to improve the documentation are welcome. Please follow the repository's contribution guidelines. 