import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemText } from '@mui/material';
import CodeBlock from '../components/CodeBlock';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function DataModels() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const userModelCode = `
// User Model Schema
{
  _id: ObjectId,
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  profilePicture: {
    type: String,
    default: "default-profile.jpg"
  },
  coverColor: {
    type: String,
    default: "#2196f3"
  },
  bio: {
    type: String,
    maxlength: 160,
    default: ""
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  darkMode: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likedMessages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  role: {
    type: String,
    enum: ['user', 'creator', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}`;

  const messageModelCode = `
// Message Model Schema
{
  _id: ObjectId,
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    maxlength: 500
  },
  image: {
    type: String
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  isApiMessage: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    placeId: {
      type: String
    },
    placeName: {
      type: String
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  type: {
    type: String,
    enum: ['regular', 'news', 'event', 'offer', 'review'],
    default: 'regular'
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String
  }],
  sequence: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}`;

  const commentModelCode = `
// Comment Model Schema
{
  _id: ObjectId,
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 280
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}`;

  const conversationModelCode = `
// Conversation Model Schema
{
  _id: ObjectId,
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      },
      placeName: {
        type: String
      }
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    text: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String
  },
  groupAdmin: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}`;

  const placeModelCode = `
// Place Model Schema
{
  _id: ObjectId,
  placeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  category: {
    type: String
  },
  description: {
    type: String
  },
  photos: [{
    type: String
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  contactInfo: {
    phone: String,
    website: String,
    email: String
  },
  popularity: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}`;

  const notificationModelCode = `
// Notification Model Schema
{
  _id: ObjectId,
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'mention', 'nearby', 'system'],
    required: true
  },
  reference: {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment'
    },
    placeId: {
      type: String
    }
  },
  text: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}`;

  const relationshipsExample = `
// User object relationships
{
  _id: "507f1f77bcf86cd799439011",
  username: "johndoe",
  // ... other user fields ...
  
  // Reference to messages created by this user
  messages: [ 
    "507f1f77bcf86cd799439012",   // Message ObjectId
    "507f1f77bcf86cd799439013"    // Message ObjectId
  ],
  
  // Reference to users this user follows
  following: [
    "507f1f77bcf86cd799439014",   // User ObjectId
    "507f1f77bcf86cd799439015"    // User ObjectId
  ],
  
  // Reference to users following this user
  followers: [
    "507f1f77bcf86cd799439016"    // User ObjectId
  ],
  
  // Reference to messages this user has liked
  likedMessages: [
    "507f1f77bcf86cd799439017",   // Message ObjectId
    "507f1f77bcf86cd799439018"    // Message ObjectId
  ]
}

// Message object relationships
{
  _id: "507f1f77bcf86cd799439012",
  text: "Hello from downtown!",
  // ... other message fields ...
  
  // Reference to the user who created this message
  userId: "507f1f77bcf86cd799439011",  // User ObjectId
  
  // Reference to users who liked this message
  likes: [
    "507f1f77bcf86cd799439016",  // User ObjectId
    "507f1f77bcf86cd799439015"   // User ObjectId
  ],
  
  // Location data associated with the message
  location: {
    coordinates: [-74.006, 40.7128],
    placeId: "downtown-manhattan"
  }
}`;

  const geoQueryExample = `
// Finding messages near a location
db.messages.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-74.006, 40.7128]  // Manhattan coordinates
      },
      $maxDistance: 5000  // Within 5km
    }
  }
})

// Finding users in a specific area
db.users.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.01, 40.71],
          [-74.01, 40.73],
          [-73.99, 40.73],
          [-73.99, 40.71],
          [-74.01, 40.71]
        ]]
      }
    }
  }
})

// Finding places near a user's current location with category filter
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-74.006, 40.7128]  // User's current location
      },
      $maxDistance: 1000  // Within 1km
    }
  },
  category: "restaurant"
})`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Models
      </Typography>
      <Typography variant="body1" paragraph>
        This document provides a detailed overview of Gringo's data models and database schema.
        Understanding these models is essential for effectively working with our API and building
        integrations with the platform.
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="User Model" />
          <Tab label="Message Model" />
          <Tab label="Comment Model" />
          <Tab label="Conversation Model" />
          <Tab label="Place Model" />
          <Tab label="Notification Model" />
          <Tab label="Relationships" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              User Model
            </Typography>
            <Typography variant="body1" paragraph>
              The User model represents platform users and contains profile information, social connections, 
              and platform preferences.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={userModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Authentication Fields"
                  secondary="username, email, and password (stored as bcrypt hash) for user authentication."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Profile Fields"
                  secondary="profilePicture, coverColor, bio, and other user-editable profile information."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Social Connections"
                  secondary="followers and following arrays containing references to other user documents."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Geolocation"
                  secondary="location field with GeoJSON Point type for user's current or last known location."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Status Fields"
                  secondary="isOnline and lastSeen for tracking user activity and availability."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Preferences"
                  secondary="darkMode and other user-specific settings for platform experience."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Message Model
            </Typography>
            <Typography variant="body1" paragraph>
              The Message model represents content shared on the platform feed, including text posts, media, and location-based posts.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={messageModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Content Fields"
                  secondary="text and image for the actual content of the message."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Author Information"
                  secondary="userId and senderUsername linking to the user who created the message."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Geolocation"
                  secondary="location field with GeoJSON Point type and associated place information."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Engagement Metrics"
                  secondary="likes array with user references and likesCount for quick access to engagement data."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Categorization"
                  secondary="type field for categorizing different kinds of messages and tags array for searchable keywords."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Visibility Control"
                  secondary="visibility field determining who can see the message (public, followers, or private)."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Comment Model
            </Typography>
            <Typography variant="body1" paragraph>
              The Comment model represents replies to messages, allowing users to engage in conversations around content.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={commentModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Reference Fields"
                  secondary="messageId linking to the parent message and userId linking to the comment author."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Content"
                  secondary="text field containing the comment content, limited to 280 characters."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Engagement"
                  secondary="likes array with user references and likesCount for tracking engagement with comments."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Metadata"
                  secondary="username for quick access to the commenter's name and createdAt for timestamp."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Conversation Model
            </Typography>
            <Typography variant="body1" paragraph>
              The Conversation model handles private messaging between users, supporting both one-on-one and group conversations.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={conversationModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Participants"
                  secondary="Array of user references for all members of the conversation."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Messages"
                  secondary="Embedded array of message objects including sender, text, and read status."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Group Chat Support"
                  secondary="isGroupChat flag, groupName, and groupAdmin fields for group conversation functionality."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Last Message Cache"
                  secondary="lastMessage object containing the most recent message for conversation previews."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Metadata"
                  secondary="Tracking of updatedAt for conversation sorting and message timestamps for chronological ordering."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Place Model
            </Typography>
            <Typography variant="body1" paragraph>
              The Place model represents physical locations that users can reference in their content and interactions.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={placeModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Identification"
                  secondary="placeId for unique identification and name for the location's display name."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Geolocation"
                  secondary="location field with GeoJSON Point type and address information."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Metadata"
                  secondary="category, description, and photos for place information."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Reviews"
                  secondary="rating (aggregate score) and reviews array with user-submitted reviews and ratings."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Business Information"
                  secondary="openingHours and contactInfo for business details when applicable."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Popularity Tracking"
                  secondary="popularity score calculated based on mentions, check-ins, and engagement."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Notification Model
            </Typography>
            <Typography variant="body1" paragraph>
              The Notification model manages user alerts for various platform activities and events.
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={notificationModelCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Properties
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Participants"
                  secondary="recipient (user receiving the notification) and sender (user triggering it, if applicable)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Classification"
                  secondary="type field categorizing the notification (like, comment, follow, mention, nearby, system)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="References"
                  secondary="reference object containing IDs for related entities (messages, comments, places)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Content"
                  secondary="text field with the notification message displayed to the user."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary="isRead flag indicating whether the user has viewed the notification."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={6}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Model Relationships
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo's data models are connected through references, enabling complex relationships between entities.
              Here are examples of how our models relate to each other:
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={relationshipsExample}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom>
              Key Relationship Patterns
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="User-to-User Relationships"
                  secondary="Followers and following connections create a social graph between users."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="User-to-Content Relationships"
                  secondary="Users create messages and comments, while also engaging with content through likes."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Location-based Relationships"
                  secondary="Messages and users are associated with locations, enabling geospatial queries."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Conversation Relationships"
                  secondary="Conversations link multiple users together and contain message history."
                />
              </ListItem>
            </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Geospatial Query Examples
            </Typography>
            <Typography variant="body1" paragraph>
              Our data models support powerful geospatial queries using MongoDB's geospatial indexing:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={geoQueryExample}
                language="javascript"
              />
            </Paper>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Data Model Best Practices
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Querying Efficiency
            </Typography>
            <Typography variant="body2">
              Use indexes appropriately, especially for geospatial queries. Leverage the compound indexes already set up on commonly queried fields.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data Validation
            </Typography>
            <Typography variant="body2">
              Always validate data against the defined schema constraints. Be mindful of required fields, string length limits, and enum values.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Reference Management
            </Typography>
            <Typography variant="body2">
              When creating or updating documents with references, ensure the referenced documents exist to maintain data integrity.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DataModels; 