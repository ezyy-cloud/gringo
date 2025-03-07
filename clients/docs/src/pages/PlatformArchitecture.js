import React from 'react';
import { Box, Typography, Paper, Divider, Grid, List, ListItem, ListItemIcon, ListItemText, Card, CardContent } from '@mui/material';
import {
  Architecture as ArchitectureIcon,
  Storage as DatabaseIcon,
  Cloud as BackendIcon,
  Devices as FrontendIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Code as CodeIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import CodeBlock from '../components/CodeBlock';

function ArchitectureCard({ icon, title, description }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

function PlatformArchitecture() {
  const architectureDiagramCode = `
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                        │
├─────────────────┬─────────────────┬──────────────┬───────────────┤
│    Web Client   │  iOS App        │ Android App  │ Admin Portal  │
│    (React)      │  (Swift/UIKit)  │ (Kotlin)     │ (React)       │
└────────┬────────┴────────┬────────┴───────┬──────┴───────┬───────┘
         │                 │                 │              │
         │                 │                 │              │
         ▼                 ▼                 ▼              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                     (Express.js / Node.js)                       │
├──────────────────────────────────────────────────────────────────┤
│    Authentication    │   Rate Limiting   │   Request Routing     │
└──────────────────────┴───────────────────┴────────────┬──────────┘
                                                        │
                                                        │
┌─────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES                                │
├────────────────┬────────────────┬───────────────┬───────────────┤
│ User Service   │ Content Service│ Location Svc  │ Analytics Svc │
│ - Auth         │ - Posts        │ - Geo Index   │ - User Data   │
│ - Profiles     │ - Media        │ - Proximity   │ - Content     │
│ - Social Graph │ - Comments     │ - Places API  │ - Reports     │
├────────────────┼────────────────┼───────────────┼───────────────┤
│ Messaging Svc  │ Notification   │ Search Svc    │ Admin Svc     │
│ - Real-time    │ - Push         │ - Posts       │ - Moderation  │
│ - Persistence  │ - Email        │ - Locations   │ - Settings    │
│ - Group Chats  │ - In-app       │ - Users       │ - Analytics   │
└────────────────┴────────────────┴───────────────┴───────────────┘
                                    │
                                    │
┌────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                │
├─────────────────┬──────────────────┬─────────────┬─────────────┤
│   MongoDB       │    Redis Cache    │  CloudFiles │ Elasticsearch│
│ - Users         │ - Session Data    │ - Images    │ - Search     │
│ - Social Data   │ - Frequent Queries│ - Videos    │ - Indexing   │
│ - Content       │ - Real-time Data  │ - Documents │ - Analytics  │
└─────────────────┴──────────────────┴─────────────┴─────────────┘
`;

  const eventFlowCode = `
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │     │ API Gateway  │     │ Message Svc  │     │  Redis PubSub │
└────┬─────┘     └───────┬──────┘     └───────┬──────┘     └───────┬──────┘
     │                   │                    │                    │
     │  POST /message    │                    │                    │
     │ ───────────────► │                    │                    │
     │                   │  Process Message   │                    │
     │                   │ ───────────────►  │                    │
     │                   │                    │  Publish Event     │
     │                   │                    │ ──────────────►   │
     │                   │                    │                    │
     │                   │                    │     Broadcast      │
     │                   │                    │ ◄─────────────────│
     │                   │    WebSocket       │                    │
     │  Message Event    │    Event           │                    │
     │ ◄─────────────────────────────────────┤                    │
     │                   │                    │                    │
`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Platform Architecture
      </Typography>
      <Typography variant="body1" paragraph>
        This document provides a comprehensive overview of Gringo's technical architecture, designed to give developers
        a clear understanding of our platform's components, data flow, and technologies.
      </Typography>

      <Typography variant="h5" gutterBottom>
        Architecture Overview
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo is built on a modern, scalable microservices architecture designed to support real-time geospatial
        features, high performance, and reliability. The platform consists of several layers:
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<FrontendIcon color="primary" />}
            title="Client Applications"
            description="Multiple client applications including web (React), iOS (Swift), Android (Kotlin), and an admin portal."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<BackendIcon color="primary" />}
            title="API Gateway"
            description="A unified entry point for all client requests, handling authentication, rate limiting, and request routing."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<CodeIcon color="primary" />}
            title="Microservices"
            description="Specialized services for users, content, location, messaging, notifications, search, and administration."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<DatabaseIcon color="primary" />}
            title="Data Layer"
            description="Combination of MongoDB for document storage, Redis for caching, cloud storage for media, and Elasticsearch for search."
          />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Architecture Diagram
      </Typography>
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
        <CodeBlock
          code={architectureDiagramCode}
          language="text"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Core Components
      </Typography>

      <Typography variant="h6" gutterBottom>
        Backend Services
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="API Gateway"
            secondary="Express.js/Node.js gateway that routes requests to appropriate microservices, handles authentication, and implements rate limiting."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="User Service"
            secondary="Manages user authentication, profiles, followers/following relationships, and user settings."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Content Service"
            secondary="Handles creation, storage, and retrieval of posts, comments, media, and interactions."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Location Service"
            secondary="Provides geospatial functionality, location indexing, proximity search, and integration with mapping APIs."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Messaging Service"
            secondary="Manages real-time messaging, message persistence, and group chat functionality with Socket.IO."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BackendIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Notification Service"
            secondary="Handles push notifications, email communications, and in-app notification delivery."
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Data Storage
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon>
            <DatabaseIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="MongoDB"
            secondary="Primary document database for storing user data, social connections, posts, and content."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DatabaseIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Redis"
            secondary="In-memory database used for caching, session storage, real-time data, and pub/sub message queuing."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DatabaseIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Cloudinary"
            secondary="Cloud storage solution for media files including images, videos, and other user uploads."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DatabaseIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Elasticsearch"
            secondary="Search engine for advanced content and location searching with geo-spatial capabilities."
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Real-time Communication
      </Typography>
      <Typography variant="body1" paragraph>
        One of Gringo's core features is real-time interaction. This is implemented using:
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Socket.IO"
            description="Provides real-time, bidirectional communication between clients and server for messaging and notifications."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Redis Pub/Sub"
            description="Enables message broadcasting across multiple server instances for horizontal scaling."
          />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Real-time Event Flow Example
      </Typography>
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
        <CodeBlock
          code={eventFlowCode}
          language="text"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Geolocation Architecture
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo's geospatial capabilities are central to the platform and implemented using:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="MongoDB Geospatial Indexes"
            secondary="2dsphere indexes for efficient proximity queries and location-based content retrieval."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="MapBox Integration"
            secondary="Client-side map rendering, geocoding, and location search functionality."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Geo-fencing"
            secondary="Custom implementation for area-based notification and content delivery."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Location Caching"
            secondary="Redis-based caching for frequently accessed location data and query results."
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Security Architecture
      </Typography>
      <Typography variant="body1" paragraph>
        Security is implemented at multiple layers of the architecture:
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<SecurityIcon color="primary" />}
            title="Authentication"
            description="JWT-based authentication with secure token storage, refresh mechanisms, and session management."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<SecurityIcon color="primary" />}
            title="Authorization"
            description="Role-based access control (RBAC) and fine-grained permissions for content and features."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<SecurityIcon color="primary" />}
            title="Data Protection"
            description="Encryption for sensitive data, both in transit (HTTPS/WSS) and at rest (encrypted fields)."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<SecurityIcon color="primary" />}
            title="Rate Limiting"
            description="API rate limiting to prevent abuse, with Redis-based implementation for distributed tracking."
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Deployment Architecture
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo's infrastructure is deployed using:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <ArchitectureIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Docker Containerization"
            secondary="All services are containerized for consistent development and deployment environments."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <ArchitectureIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Kubernetes Orchestration"
            secondary="Manages container deployment, scaling, and service discovery across the platform."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <ArchitectureIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="CI/CD Pipeline"
            secondary="Automated testing and deployment workflow using GitHub Actions."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <ArchitectureIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Infrastructure as Code"
            secondary="Terraform scripts for consistent infrastructure provisioning."
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Performance Optimizations
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo implements several strategies to ensure high performance:
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Multi-level Caching"
            description="Caching at API, service, and database levels using Redis to reduce latency for frequent queries."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Content Delivery Network"
            description="CDN integration for static assets and media content to improve global access speed."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Database Optimization"
            description="Optimized indexes, query patterns, and data structures for efficient data retrieval."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ArchitectureCard
            icon={<PerformanceIcon color="primary" />}
            title="Lazy Loading"
            description="Implementation of lazy loading patterns for images, data, and components to improve perceived performance."
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Technology Stack Summary
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Backend Technologies
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Node.js" secondary="Server runtime environment" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Express.js" secondary="Web framework" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Socket.IO" secondary="Real-time communication" />
              </ListItem>
              <ListItem>
                <ListItemText primary="MongoDB/Mongoose" secondary="Database and ODM" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Redis" secondary="Caching and messaging" />
              </ListItem>
              <ListItem>
                <ListItemText primary="JWT" secondary="Authentication" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Frontend Technologies
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="React" secondary="Web UI framework" />
              </ListItem>
              <ListItem>
                <ListItemText primary="React Router" secondary="Client-side routing" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Socket.IO Client" secondary="Real-time communication" />
              </ListItem>
              <ListItem>
                <ListItemText primary="MapBox/React-Map-GL" secondary="Interactive maps" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Swift/UIKit" secondary="iOS native app" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Kotlin" secondary="Android native app" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PlatformArchitecture; 