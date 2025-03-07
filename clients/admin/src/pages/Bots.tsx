import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Divider,
  DialogContentText,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import DataTable from '../components/DataTable';
import { getBot as getMainServerBot } from '../services/api';
import botService from '../services/botService';
import { useAuth } from '../hooks/useAuth';

interface Bot {
  _id: string;
  name?: string;
  username: string;
  email: string;
  type: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  creator: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  lastActive: string;
  lastSeen: string;
  purpose: string;
  isBot: boolean;
  isAdmin: boolean;
  profilePicture: string;
  coverColor: string;
  bio: string;
  isOnline: boolean;
  darkMode: boolean;
  rateLimits?: {
    messagesPerMinute: number;
    actionsPerHour: number;
  };
  capabilities?: string[];
  webhookUrl: string | null;
  // Keep other fields but mark as optional
  totalPosts?: number;
  totalInteractions?: number;
}

interface BotStatus {
  id: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  memory: number;
  cpu: number;
  lastMessage: string;
  lastError: string | null;
}

interface BotMetrics {
  messagesProcessed: number;
  messagesSent: number;
  errors: number;
  avgResponseTime: number;
  timePoints: string[];
  dataPoints: number[];
}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bot-tabpanel-${index}`}
      aria-labelledby={`bot-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Bots: React.FC = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    purpose: '',
    type: '',
    status: 'active',
    capabilities: ['messaging'],
    webhookUrl: '',
    creator: '',
  });
  const [formErrors, setFormErrors] = useState({
    username: '',
    email: '',
    password: '',
    type: '',
    purpose: '',
    status: '',
    webhookUrl: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [botMetrics, setBotMetrics] = useState<BotMetrics | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [serviceConnected, setServiceConnected] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [dialogTitle, setDialogTitle] = useState('Create Bot');
  const [submitting, setSubmitting] = useState(false);
  const [botTypes, setBotTypes] = useState([]);
  const [loadingBotTypes, setLoadingBotTypes] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [deleteError, setDeleteError] = useState('');
  // Add state for rate limiting
  const [rateLimited, setRateLimited] = useState(false);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Username validation
  const isValidUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username);
  };

  // Test connection to bot microservice
  useEffect(() => {
    const testConnection = async () => {
      // If we're currently rate limited, don't try again until cooldown expires
      if (rateLimited) {
        return;
      }
      
      setConnectionTested(false);
      try {
        const healthResult = await botService.getBotServiceHealth();
        const connectionResult = await botService.testBotConnection();
        
        // Clear rate limited state if successful
        setRateLimited(false);
        setRetryCount(0);
        
        // If health check succeeded but connection test failed, still consider it partially connected
        const partiallyConnected = healthResult.status === 'ok' && !connectionResult.success;
        
        setServiceConnected(healthResult.status === 'ok' && connectionResult.success === true);
        setConnectionTested(true);
        
        if (healthResult.status === 'ok' && connectionResult.success === true) {
          // Fetch active bots from the microservice
          fetchActiveBots();
          
          setSnackbar({
            open: true,
            message: 'Successfully connected to bot microservice',
            severity: 'success',
          });
        } else if (partiallyConnected) {
          console.warn('Bot microservice is partially available:', healthResult, connectionResult);
          
          // Show a warning since we can connect to health endpoint but not the API endpoints
          setSnackbar({
            open: true,
            message: 'Connected to bot service but API endpoints may be unavailable. Limited functionality available.',
            severity: 'warning',
          });
          
          // Try to fetch bots even with limited functionality
          fetchActiveBots();
        } else {
          console.warn('Bot microservice is not available:', healthResult, connectionResult);
          
          // Provide more detailed error message
          let errorMessage = 'Bot microservice is not available';
          if (healthResult.status !== 'ok') {
            errorMessage = `Health check failed: ${healthResult.message || 'Unknown error'}`;
          } else if (!connectionResult.success) {
            errorMessage = connectionResult.message || 'Connection test failed';
          }
          
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'warning',
          });
        }
      } catch (error) {
        console.error('Error testing connection to bot microservice:', error);
        setServiceConnected(false);
        setConnectionTested(true);
        
        // Handle rate limiting error (429)
        if (error.response && error.response.status === 429) {
          handleRateLimitError('connection test');
          return;
        }
        
        // Provide more detailed error message
        let errorMessage = 'Failed to connect to bot microservice';
        if (error.isBotServiceDown) {
          errorMessage = 'Bot microservice is down or unreachable. Please check if the service is running.';
        } else if (error.response) {
          errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
        }
        
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
      }
    };
    
    testConnection();
    
    // Check connection every minute, but not if rate limited
    const interval = setInterval(() => {
      if (!rateLimited) {
        testConnection();
      }
    }, 60000);
    
    return () => {
      clearInterval(interval);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [rateLimited, retryCount]);

  // Handle rate limit errors with exponential backoff
  const handleRateLimitError = (operation: string) => {
    // Set rate limited state
    setRateLimited(true);
    
    // Calculate backoff time (exponential with jitter)
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 60000; // 1 minute max
    const exponentialBackoff = Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = exponentialBackoff + jitter;
    
    // Update retry count for next attempt
    setRetryCount(prev => prev + 1);
    
    // Show message to user
    setSnackbar({
      open: true,
      message: `Rate limited by bot service. Will retry ${operation} in ${Math.round(delay/1000)} seconds.`,
      severity: 'warning',
    });
    
    // Clear any existing timeout
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
    
    // Set timeout to clear rate limited state after delay
    const timeout = setTimeout(() => {
      setRateLimited(false);
    }, delay);
    
    setRetryTimeout(timeout);
  };

  // Fetch active bots from the bot microservice
  const fetchActiveBots = async () => {
    try {
      const response = await botService.getActiveBots();
      
      // Handle different possible response structures without excessive logging
      if (response) {
        // If we have a bots array directly
        const activeBots = response.bots || response.data || [];
        
        if (Array.isArray(activeBots) && activeBots.length > 0) {
          // Update statuses with active bots
          const statuses: Record<string, BotStatus> = {};
          
          activeBots.forEach(activeBot => {
            // Use the ID field that exists (either _id or id)
            const botId = activeBot._id || activeBot.id;
            
            if (botId) {
              statuses[botId] = {
                id: botId,
                status: 'running',
                uptime: activeBot.uptime || 0,
                memory: activeBot.memory || 0,
                cpu: activeBot.cpu || 0,
                lastMessage: activeBot.lastMessage || '',
                lastError: null
              };
            }
          });
          
          if (Object.keys(statuses).length > 0) {
            setBotStatuses(prev => ({
              ...prev,
              ...statuses
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active bots:', error);
    }
  };

  // Fetch bots from bot microservice
  useEffect(() => {
    const fetchBots = async () => {
      // Don't fetch if rate limited
      if (rateLimited) return;
      
      try {
        setLoading(true);
        
        const response = await botService.getBots();
        
        // Reset rate limited state on success
        setRateLimited(false);
        setRetryCount(0);
        
        if (response && response.success) {
          // Handle various response formats without logging
          let botsData;
          if (response.bots && Array.isArray(response.bots)) {
            botsData = response.bots;
          } else if (response.data && Array.isArray(response.data)) {
            botsData = response.data;
          } else if (Array.isArray(response)) {
            botsData = response;
          } else {
            botsData = [];
          }
          
          setBots(botsData);
          
          // Fetch statuses if service is connected
          if (serviceConnected) {
            fetchBotStatuses(botsData);
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to fetch bots',
            severity: 'error',
          });
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
        
        // Handle rate limiting error specifically
        if (error.response && error.response.status === 429) {
          handleRateLimitError('bot fetching');
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to fetch bots. Please try again.',
            severity: 'error',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch bots when the component mounts, if not rate limited
    if (!rateLimited) {
      fetchBots();
    }
  }, [serviceConnected, rateLimited]);

  // Fetch bot statuses from bot microservice
  const fetchBotStatuses = async (botsList: Bot[]) => {
    if (!serviceConnected) {
      return;
    }
    
    if (!botsList || botsList.length === 0) {
      return;
    }
    
    try {
      // First, get list of active bots from the microservice
      const activeBotsResponse = await botService.getActiveBots();
      
      // Create a map of active bot IDs for quick lookup
      const activeBotIds = new Set<string>();
      
      if (activeBotsResponse && activeBotsResponse.success && Array.isArray(activeBotsResponse.bots)) {
        activeBotsResponse.bots.forEach(bot => {
          if (bot._id || bot.id) {
            activeBotIds.add(bot._id || bot.id);
          }
        });
      }
      
      const statuses = {};
      
      // Process all bots in parallel
      const statusPromises = botsList.map(async (bot) => {
        try {
          // Try to get status from bot service
          const status = await botService.getBotStatus(bot._id);
          return { id: bot._id, status };
        } catch (error) {
          console.error(`Error getting status for bot ${bot._id}:`, error);
          // Return a fallback status based on DB status
          return { 
            id: bot._id, 
            status: {
              id: bot._id,
              status: bot.status === 'active' ? 'running' : 'stopped',
              uptime: 0,
              memory: 0,
              cpu: 0,
              lastMessage: '',
              lastError: 'Bot service unavailable'
            }
          };
        }
      });
      
      // Wait for all status requests to complete
      const results = await Promise.all(statusPromises);
      
      // Convert the results to the status object
      results.forEach(result => {
        statuses[result.id] = result.status;
      });
      
      // Update the state with all the statuses
      setBotStatuses(statuses);
    } catch (error) {
      console.error('Error fetching bot statuses:', error);
      
      // Create default statuses for all bots based on their DB status
      const defaultStatuses = {};
      botsList.forEach(bot => {
        defaultStatuses[bot._id] = {
          id: bot._id,
          status: bot.status === 'active' ? 'running' : 'stopped',
          uptime: 0,
          memory: 0,
          cpu: 0,
          lastMessage: '',
          lastError: 'Bot service unavailable'
        };
      });
      
      setBotStatuses(defaultStatuses);
    }
  };

  // Fetch bot metrics when a bot is selected
  useEffect(() => {
    if (selectedBotId && serviceConnected) {
      fetchBotMetrics(selectedBotId);
      fetchBotLogs(selectedBotId);
    }
  }, [selectedBotId, serviceConnected]);

  const fetchBotMetrics = async (botId: string) => {
    if (!serviceConnected || !botId) return;
    
    try {
      const metrics = await botService.getBotMetrics(botId);
      if (metrics && metrics.success) {
        // Ensure we have default values for all metric properties
        setBotMetrics({
          messagesProcessed: 0,
          messagesSent: 0,
          errors: 0,
          avgResponseTime: 0,
          timePoints: [],
          dataPoints: [],
          ...metrics.data || {}
        });
      } else {
        // Set default metrics if response is unsuccessful
        setBotMetrics({
          messagesProcessed: 0,
          messagesSent: 0,
          errors: 0,
          avgResponseTime: 0,
          timePoints: [],
          dataPoints: []
        });
      }
    } catch (error) {
      console.error('Error fetching bot metrics:', error);
      // Set default metrics on error
      setBotMetrics({
        messagesProcessed: 0,
        messagesSent: 0,
        errors: 0,
        avgResponseTime: 0,
        timePoints: [],
        dataPoints: []
      });
    }
  };

  const fetchBotLogs = async (botId: string) => {
    if (!serviceConnected || !botId) return;
    
    try {
      const logs = await botService.getBotLogs(botId);
      if (logs && logs.success) {
        setBotLogs(logs.logs || logs.data || []);
      } else {
        // Set empty logs array if response is unsuccessful
        setBotLogs([]);
      }
    } catch (error) {
      console.error('Error fetching bot logs:', error);
      // Set empty logs array on error
      setBotLogs([]);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (bot: Bot | null = null) => {
    setDialogTitle(bot ? 'Edit Bot' : 'Create New Bot');
    
    if (bot) {
      setEditingBot(bot);
      setFormData({
        username: bot.username || '',
        email: bot.email || '',
        password: '', // Password field is empty on edit
        purpose: bot.purpose || '',
        status: bot.status || 'active',
        capabilities: bot.capabilities || ['messaging'],
        webhookUrl: bot.webhookUrl || '',
        creator: bot.creator?._id || user?._id || '',
        type: bot.type || '',
      });
    } else {
      setEditingBot(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        purpose: '',
        status: 'active',
        capabilities: ['messaging'],
        webhookUrl: '',
        creator: user?._id || '',
        type: '',
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    
    if (!name) return;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any previous error for this field
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Validate username when it changes
    if (name === 'username' && typeof value === 'string') {
      if (!isValidUsername(value)) {
        setFormErrors(prev => ({
          ...prev,
          username: 'Username may only contain letters, numbers, underscores and hyphens'
        }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // Reset all form errors
      setFormErrors({
        username: '',
        email: '',
        password: '',
        type: '',
        purpose: '',
        status: '',
        webhookUrl: ''
      });
      
      // Validate form fields
      let hasErrors = false;
      
      // Validate username
      if (!formData.username) {
        setFormErrors(prev => ({ ...prev, username: 'Username is required' }));
        hasErrors = true;
      } else if (!isValidUsername(formData.username)) {
        setFormErrors(prev => ({ ...prev, username: 'Username may only contain letters, numbers, underscores and hyphens' }));
        hasErrors = true;
      }
      
      // Validate purpose
      if (!formData.purpose) {
        setFormErrors(prev => ({ ...prev, purpose: 'Purpose is required' }));
        hasErrors = true;
      }
      
      // Validate type - must be one of the valid microservice types
      if (!formData.type) {
        setFormErrors(prev => ({ ...prev, type: 'Bot type is required' }));
        hasErrors = true;
      } else if (!["moderator", "news", "weather"].includes(formData.type)) {
        setFormErrors(prev => ({ 
          ...prev, 
          type: `Invalid bot type. Must be one of: moderator, news, weather. Got: ${formData.type}` 
        }));
        hasErrors = true;
      }
      
      // Validate webhook URL if provided
      if (formData.webhookUrl && !formData.webhookUrl.startsWith('http')) {
        setFormErrors(prev => ({ ...prev, webhookUrl: 'Webhook URL must start with http:// or https://' }));
        hasErrors = true;
      }
      
      if (hasErrors) {
        return;
      }
      
      setSubmitting(true);
      
      // Prepare email and password values if not provided
      let email = formData.email;
      let password = formData.password;
      
      if (!editingBot) {
        // For new bots, generate default email if not provided
        if (!email) {
          email = `${formData.username}@bot.gringo.com`;
        }
        
        // For new bots, generate random password if not provided
        if (!password) {
          password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
      }
      
      if (editingBot) {
        // Update existing bot
        const botData = {
          ...editingBot,
          username: formData.username,
          email: formData.email || editingBot.email,
          type: formData.type,
          purpose: formData.purpose,
          status: formData.status,
          webhookUrl: formData.webhookUrl || null
        };
        
        const response = await botService.updateBot(botData._id, botData);
        
        if (response.success) {
          // Update bot in state
          setBots(prevBots => 
            prevBots.map(bot => bot._id === botData._id ? response.data : bot)
          );
          
          setSnackbar({
            open: true,
            message: 'Bot updated successfully',
            severity: 'success',
          });
        } else {
          throw new Error(response.message || 'Failed to update bot');
        }
      } else {
        // Create new bot - use the exact format that worked in the curl command
        const botData = {
          username: formData.username,
          email: email,
          password: password,
          type: formData.type,
          purpose: formData.purpose
        };
        
        try {
          if (import.meta.env.DEV) {
            console.log('Creating bot with data:', botData);
          }
          
          const response = await botService.createBot(botData);
          
          if (import.meta.env.DEV) {
            console.log('Bot creation response:', response);
          }
          
          if (response.success) {
            const newBot = response.data;
            
            // Ensure we have all required fields for the Bot interface
            const completeBot: Bot = {
              _id: newBot._id || newBot.id || `temp-${Date.now()}`,
              username: newBot.username || botData.username,
              email: newBot.email || botData.email,
              type: newBot.type || botData.type,
              purpose: newBot.purpose || botData.purpose,
              status: (newBot.status || 'active') as 'active' | 'inactive' | 'suspended' | 'pending',
              creator: newBot.creator || {
                _id: user?._id || 'unknown',
                username: user?.username || 'Unknown User',
                email: user?.email || '',
              },
              createdAt: newBot.createdAt || new Date().toISOString(),
              lastActive: newBot.lastActive || new Date().toISOString(),
              lastSeen: newBot.lastSeen || new Date().toISOString(),
              isBot: true,
              isAdmin: false,
              profilePicture: newBot.profilePicture || '',
              coverColor: newBot.coverColor || '#' + Math.floor(Math.random()*16777215).toString(16),
              bio: newBot.bio || botData.purpose,
              isOnline: false,
              darkMode: false,
              webhookUrl: newBot.webhookUrl || null,
            };
            
            // Add new bot to state
            setBots(prevBots => [...prevBots, completeBot]);
            
            setSnackbar({
              open: true,
              message: response.message || 'Bot created successfully',
              severity: 'success',
            });
            
            // Close dialog and reset form
            setOpenDialog(false);
            
            // Refresh statuses if service is connected
            if (serviceConnected) {
              fetchBotStatuses([completeBot]);
            }
          } else {
            throw new Error(response.message || 'Failed to create bot');
          }
        } catch (error) {
          console.error('Error creating bot:', error);
          setSnackbar({
            open: true,
            message: error instanceof Error ? error.message : 'Error creating bot',
            severity: 'error',
          });
        }
      }
      
    } catch (error) {
      console.error('Error submitting bot:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'An error occurred',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBot = async (id: string) => {
    // Find the bot to delete
    const bot = bots.find(b => b._id === id);
    if (bot) {
      // Set the bot to delete and open the confirmation modal
      setBotToDelete(bot);
      setDeleteModalOpen(true);
      setConfirmUsername('');
      setDeleteError('');
    }
  };

  const confirmDeleteBot = async () => {
    if (!botToDelete) return;
    
    try {
      // Check if the entered username matches the bot username
      if (confirmUsername !== botToDelete.username) {
        setDeleteError('Username does not match');
        return;
      }
      
      // Clear error if previously set
      setDeleteError('');
      
      // Call the API to delete the bot
      await botService.deleteBot(botToDelete._id);
      
      // Remove bot from state
      setBots(prevBots => prevBots.filter(bot => bot._id !== botToDelete._id));
      
      // Close the modal and reset state
      setDeleteModalOpen(false);
      setBotToDelete(null);
      setConfirmUsername('');
      
      setSnackbar({
        open: true,
        message: 'Bot deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting bot:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete bot: ${error.message}`,
        severity: 'error',
      });
      
      // Close the modal even on error
      setDeleteModalOpen(false);
      setBotToDelete(null);
      setConfirmUsername('');
    }
  };
  
  // Add function to handle closing the delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setBotToDelete(null);
    setConfirmUsername('');
    setDeleteError('');
  };

  const handleStartBot = async (id: string) => {
    try {
      const response = await botService.startBot(id);
      
      if (response.success) {
        // Update status in state
        setBotStatuses(prev => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            status: 'running'
          }
        }));
        
        setSnackbar({
          open: true,
          message: 'Bot started successfully',
          severity: 'success',
        });
      } else {
        throw new Error(response.message || 'Failed to start bot');
      }
    } catch (error) {
      console.error('Error starting bot:', error);
      setSnackbar({
        open: true,
        message: `Failed to start bot: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleStopBot = async (id: string) => {
    try {
      const response = await botService.stopBot(id);
      
      if (response.success) {
        // Update status in state
        setBotStatuses(prev => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            status: 'stopped'
          }
        }));
        
        setSnackbar({
          open: true,
          message: 'Bot stopped successfully',
          severity: 'success',
        });
      } else {
        throw new Error(response.message || 'Failed to stop bot');
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
      setSnackbar({
        open: true,
        message: `Failed to stop bot: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleRestartBot = async (id: string) => {
    try {
      const response = await botService.restartBot(id);
      
      if (response.success) {
        // Update status in state
        setBotStatuses(prev => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            status: 'running'
          }
        }));
        
        setSnackbar({
          open: true,
          message: 'Bot restarted successfully',
          severity: 'success',
        });
      } else {
        throw new Error(response.message || 'Failed to restart bot');
      }
    } catch (error) {
      console.error('Error restarting bot:', error);
      setSnackbar({
        open: true,
        message: `Failed to restart bot: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleViewDetails = (botId: string) => {
    setSelectedBotId(botId);
    setTabValue(0);
    
    // Fetch metrics and logs for the selected bot
    fetchBotMetrics(botId);
    fetchBotLogs(botId);
  };

  // Add a refresh button for bot statuses
  const handleRefreshStatuses = async () => {
    if (serviceConnected) {
      await fetchBotStatuses(bots);
      setSnackbar({
        open: true,
        message: 'Bot statuses refreshed',
        severity: 'success',
      });
    }
  };

  const columns = [
    { id: 'username', field: 'username', label: 'Username', flex: 1 },
    { id: 'type', field: 'type', label: 'Type', flex: 1 },
    { 
      id: 'status', 
      field: 'status', 
      label: 'Status', 
      flex: 1,
      renderCell: (params: any) => {
        // Simple direct display of status with basic styling
        const status = String(params.row.status || '');
        
        // Map status to display and color
        let display = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        let color: 'success' | 'warning' | 'error' | 'default' = 'default';
        
        if (status.toLowerCase() === 'pending') {
          color = 'warning';
          display = 'Pending';
        } else if (status.toLowerCase() === 'active') {
          color = 'success';
          display = 'Active';
        } else if (status.toLowerCase() === 'suspended') {
          color = 'error';
          display = 'Suspended';
        }
        
        return <Chip label={display} color={color} size="small" />;
      }
    },
    { 
      id: 'creator', 
      field: 'creator', 
      label: 'Creator', 
      flex: 1, 
      renderCell: (params: any) => {
        // Direct access to creator username with detailed logging
        const creator = params.row.creator;
        
        if (creator) {
          if (typeof creator === 'object' && creator.username) {
            return creator.username;
          } else if (typeof creator === 'string') {
            return creator;
          }
        }
        
        return 'System';
      }
    },
    { 
      id: 'createdAt', 
      field: 'createdAt', 
      label: 'Created', 
      flex: 1,
      renderCell: (params: any) => {
        return new Date(params.row.createdAt).toLocaleString();
      }
    },
    { 
      id: 'lastActive', 
      field: 'lastActive', 
      label: 'Last Active', 
      flex: 1,
      renderCell: (params: any) => {
        return new Date(params.row.lastActive).toLocaleString();
      }
    },
    {
      id: 'actions',
      field: 'actions',
      label: 'Actions',
      flex: 1,
      renderCell: (params: any) => {
        const botId = params.row._id;
        const botStatus = botStatuses[botId];
        const isRunning = botStatus?.status === 'running';
        
        return (
          <Box>
            {serviceConnected && (
              <>
                {isRunning ? (
                  <Tooltip title="Stop Bot">
                    <IconButton onClick={() => handleStopBot(botId)} color="error" size="small">
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Start Bot">
                    <IconButton onClick={() => handleStartBot(botId)} color="success" size="small">
                      <PlayArrowIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Restart Bot">
                  <IconButton onClick={() => handleRestartBot(botId)} color="primary" size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Edit Bot">
              <IconButton onClick={() => handleOpenDialog(params.row)} color="primary" size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View Details">
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => handleViewDetails(botId)}
                sx={{ ml: 1 }}
              >
                Details
              </Button>
            </Tooltip>
            <Tooltip title="Delete Bot">
              <IconButton onClick={() => handleDeleteBot(botId)} color="error" size="small" sx={{ ml: 1 }}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  useEffect(() => {
    const fetchBotTypes = async () => {
      // Don't fetch if rate limited
      if (rateLimited) return;
      
      try {
        setLoadingBotTypes(true);
        
        const response = await botService.getBotTypes();
        
        if (import.meta.env.DEV) {
          console.log('Bot types response:', response);
        }
        
        // Reset rate limited state on success
        setRateLimited(false);
        setRetryCount(0);
        
        if (response && response.data && response.data.length > 0) {
          if (import.meta.env.DEV) {
            console.log('Setting bot types:', response.data);
          }
          setBotTypes(response.data);
          
          // Set the first bot type as the default in the form if we're not editing
          if (!editingBot && response.data[0] && response.data[0].value) {
            setFormData(prevFormData => ({
              ...prevFormData,
              type: response.data[0].value
            }));
          }
        } else {
          console.warn('No bot types returned from API, using fallback types based on microservice requirements');
          // Fallback types matching exactly what the microservice supports
          const fallbackBotTypes = [
            { value: "moderator", label: "Moderator Bot" },
            { value: "news", label: "News Bot" },
            { value: "weather", label: "Weather Bot" }
          ];
          
          setBotTypes(fallbackBotTypes);
          
          // Use fallback bot type for new forms
          if (!editingBot) {
            setFormData(prevFormData => ({
              ...prevFormData,
              type: fallbackBotTypes[0].value
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching bot types:', error);
        
        // Handle rate limiting error specifically
        if (error.response && error.response.status === 429) {
          handleRateLimitError('bot types fetching');
        } else {
          // Use hardcoded fallback types when API fails - using exactly what the microservice supports
          const fallbackBotTypes = [
            { value: "moderator", label: "Moderator Bot" },
            { value: "news", label: "News Bot" },
            { value: "weather", label: "Weather Bot" }
          ];
          
          console.warn('Using fallback bot types due to API error');
          setBotTypes(fallbackBotTypes);
          
          // Use fallback bot type for new forms
          if (!editingBot) {
            setFormData(prevFormData => ({
              ...prevFormData,
              type: fallbackBotTypes[0].value
            }));
          }
        }
      } finally {
        setLoadingBotTypes(false);
      }
    };

    // Only fetch bot types if not rate limited
    if (!rateLimited) {
      fetchBotTypes();
    }
  }, [rateLimited, editingBot]); // Add editingBot as dependency

  // Render bot type in dropdown without logging
  const renderBotTypeItem = (type: { value: string; label: string }) => {
    // Only log in development environment and only if explicitly enabled
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true') {
      console.log('Rendering bot type item:', type);
    }
    
    // Validate the type object structure
    if (!type || typeof type !== 'object') {
      return <MenuItem key="invalid-type" value="">Invalid Type</MenuItem>;
    }
    
    return (
      <MenuItem key={type.value || 'unknown'} value={type.value || ''}>
        {type.label || type.value || 'Unnamed Type'}
      </MenuItem>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Bot Management</Typography>
    <Box>
          {connectionTested && (
            <Chip 
              label={serviceConnected ? "Bot Service Connected" : "Bot Service Disconnected"} 
              color={serviceConnected ? "success" : "error"} 
              sx={{ mr: 2 }}
            />
          )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
            sx={{ mr: 2 }}
        >
          Create Bot
        </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefreshStatuses}
            disabled={!serviceConnected}
          >
            Refresh Status
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
      <DataTable
              rows={bots}
        columns={columns}
              loading={loading}
              pageSize={10}
              title="Bot List"
            />
          </Grid>
          
          {selectedBotId && (
            <Grid item xs={12} sx={{ mt: 4 }}>
              <Paper sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="bot details tabs">
                    <Tab label="Status" />
                    <Tab label="Metrics" />
                    <Tab label="Logs" />
                    <Tab label="Configuration" />
                  </Tabs>
                </Box>
                
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Bot Status</Typography>
                    <Box>
                      {serviceConnected && botStatuses[selectedBotId] && (
                        <>
                          {botStatuses[selectedBotId].status === 'running' ? (
                            <Button 
                              variant="contained" 
                              color="error" 
                              startIcon={<StopIcon />}
                              onClick={() => handleStopBot(selectedBotId)}
                              sx={{ mr: 1 }}
                            >
                              Stop Bot
                            </Button>
                          ) : (
                            <Button 
                              variant="contained" 
                              color="success" 
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handleStartBot(selectedBotId)}
                              sx={{ mr: 1 }}
                            >
                              Start Bot
                            </Button>
                          )}
                          <Button 
                            variant="outlined" 
                            startIcon={<RefreshIcon />}
                            onClick={() => handleRestartBot(selectedBotId)}
                          >
                            Restart Bot
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                  
                  {serviceConnected ? (
                    botStatuses[selectedBotId] ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="subtitle1" color="text.secondary">Status</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Box 
                                sx={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: '50%', 
                                  bgcolor: botStatuses[selectedBotId].status === 'running' 
                                    ? 'success.main' 
                                    : botStatuses[selectedBotId].status === 'error' 
                                      ? 'error.main' 
                                      : 'text.disabled',
                                  mr: 1
                                }} 
                              />
                              <Typography variant="h5">
                                {botStatuses[selectedBotId].status === 'running' ? 'Running' : 
                                 botStatuses[selectedBotId].status === 'error' ? 'Error' : 'Stopped'}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="subtitle1" color="text.secondary">Uptime</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>
                              {botStatuses[selectedBotId].uptime > 0 
                                ? `${Math.floor(botStatuses[selectedBotId].uptime / 3600)}h ${Math.floor((botStatuses[selectedBotId].uptime % 3600) / 60)}m ${botStatuses[selectedBotId].uptime % 60}s`
                                : 'Not running'}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" color="text.secondary">Resource Usage</Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Memory:</span>
                                <span>{(botStatuses[selectedBotId]?.memory || 0).toFixed(2)} MB</span>
                              </Typography>
                              <Box sx={{ width: '100%', mt: 0.5, mb: 1.5 }}>
                                <Box 
                                  sx={{ 
                                    height: 4, 
                                    width: `${Math.min((botStatuses[selectedBotId]?.memory || 0) / 5, 100)}%`, 
                                    bgcolor: 'primary.main',
                                    borderRadius: 1
                                  }} 
                                />
                              </Box>
                              
                              <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>CPU:</span>
                                <span>{(botStatuses[selectedBotId]?.cpu || 0).toFixed(2)}%</span>
                              </Typography>
                              <Box sx={{ width: '100%', mt: 0.5 }}>
                                <Box 
                                  sx={{ 
                                    height: 4, 
                                    width: `${Math.min((botStatuses[selectedBotId]?.cpu || 0), 100)}%`, 
                                    bgcolor: 'primary.main',
                                    borderRadius: 1
                                  }} 
                                />
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" color="text.secondary">Last Message</Typography>
                            <Typography variant="body1" sx={{ mt: 1, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace' }}>
                              {botStatuses[selectedBotId].lastMessage || 'No messages processed yet'}
                            </Typography>
                          </Paper>
                        </Grid>
                        {botStatuses[selectedBotId].lastError && (
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: '#fff8f8', border: '1px solid #ffcdd2' }}>
                              <Typography variant="subtitle1" color="error">Last Error</Typography>
                              <Typography variant="body1" sx={{ mt: 1, p: 1.5, bgcolor: '#ffebee', borderRadius: 1, fontFamily: 'monospace' }}>
                                {botStatuses[selectedBotId].lastError}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Button 
                              variant="outlined" 
                              startIcon={<RefreshIcon />}
                              onClick={() => {
                                fetchBotMetrics(selectedBotId);
                                const bot = bots.find(b => b.id === selectedBotId);
                                if (bot) {
                                  fetchBotStatuses([bot]);
                                }
                              }}
                            >
                              Refresh Data
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    )
                  ) : (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Bot service is not connected. Cannot retrieve real-time status.
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => botService.testBotConnection()}
                        sx={{ ml: 2 }}
                      >
                        Retry Connection
                      </Button>
                    </Alert>
                  )}
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>Bot Metrics</Typography>
                  {serviceConnected ? (
                    botMetrics ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1">Messages Processed</Typography>
                            <Typography variant="h6">{botMetrics.messagesProcessed}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1">Messages Sent</Typography>
                            <Typography variant="h6">{botMetrics.messagesSent}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1">Errors</Typography>
                            <Typography variant="h6">{botMetrics.errors}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1">Avg Response Time</Typography>
                            <Typography variant="h6">{(botMetrics?.avgResponseTime || 0).toFixed(2)} ms</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2, height: 300 }}>
                            <Typography variant="subtitle1">Activity Chart</Typography>
                            {/* Chart would go here - using placeholder text */}
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography color="text.secondary">
                                Chart visualization would be displayed here
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography>No metrics available for this bot</Typography>
                    )
                  ) : (
                    <Alert severity="warning">
                      Bot service is not connected. Cannot retrieve metrics.
                    </Alert>
                  )}
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Bot Logs</Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchBotLogs(selectedBotId)}
                      disabled={!serviceConnected}
                    >
                      Refresh Logs
                    </Button>
                  </Box>
                  
                  {serviceConnected ? (
                    botLogs.length > 0 ? (
                      <Paper 
                        sx={{ 
                          p: 2, 
                          maxHeight: 400, 
                          overflow: 'auto', 
                          bgcolor: '#1e1e1e', 
                          color: '#e0e0e0',
                          borderRadius: 1
                        }}
                      >
                        {botLogs.map((log, index) => (
                          <Typography 
                            key={index} 
                            variant="body2" 
                            component="pre" 
                            sx={{ 
                              fontFamily: 'monospace', 
                              my: 0.5,
                              fontSize: '0.85rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all'
                            }}
                          >
                            {log}
                          </Typography>
                        ))}
                      </Paper>
                    ) : (
                      <Alert severity="info">No logs available for this bot</Alert>
                    )
                  ) : (
                    <Alert severity="warning">
                      Bot service is not connected. Cannot retrieve logs.
                    </Alert>
                  )}
                </TabPanel>
                
                <TabPanel value={tabValue} index={3}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Bot Configuration</Typography>
                    <Button 
                      variant="contained" 
                      color="primary"
                      disabled={!serviceConnected}
                      onClick={() => {
                        // This would open a configuration editor dialog
                        setSnackbar({
                          open: true,
                          message: 'Configuration editor not implemented yet',
                          severity: 'info',
                        });
                      }}
                    >
                      Edit Configuration
                    </Button>
                  </Box>
                  
                  {serviceConnected ? (
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Configuration Parameters</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        This section will allow you to modify the bot's configuration parameters.
                        The configuration editor is not yet implemented.
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle1" gutterBottom>API Key</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          size="small"
                          value="••••••••••••••••••••••••••••••"
                          disabled
                          sx={{ mr: 2 }}
                        />
                        <Button 
                          variant="outlined"
                          onClick={() => {
                            setSnackbar({
                              open: true,
                              message: 'API key regeneration not implemented yet',
                              severity: 'info',
                            });
                          }}
                        >
                          Regenerate
                        </Button>
                      </Box>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Regenerating the API key will invalidate the previous key and require updating any services using it.
                      </Alert>
                    </Paper>
                  ) : (
                    <Alert severity="warning">
                      Bot service is not connected. Cannot retrieve or update configuration.
                    </Alert>
                  )}
                </TabPanel>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Bot Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  variant="outlined"
                  required
                  error={!!formErrors.username}
                  helperText={formErrors.username || "Username for the bot"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  variant="outlined"
                  placeholder={formData.username ? `${formData.username}@bot.gringo.com` : ''}
                  helperText={formErrors.email || "Leave blank to use auto-generated email"}
                  error={!!formErrors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  variant="outlined"
                  placeholder="Leave blank to generate random password"
                  helperText={formErrors.password || (!editingBot ? "If left blank, a random password will be generated" : "Leave blank to keep current password")}
                  error={!!formErrors.password}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="bot-type-label">Bot Type</InputLabel>
                  <Select
                    labelId="bot-type-label"
                    id="type"
                    name="type"
                    value={botTypes.length > 0 ? formData.type : ''}
                    onChange={handleInputChange}
                    label="Bot Type"
                    required
                  >
                    {loadingBotTypes ? (
                      <MenuItem key="loading" value="" disabled>Loading bot types...</MenuItem>
                    ) : botTypes.length > 0 ? (
                      botTypes.map(renderBotTypeItem)
                    ) : (
                      <MenuItem key="no-types" value="" disabled>No bot types available</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  variant="outlined"
                  multiline
                  rows={3}
                  required
                  error={!!formErrors.purpose}
                  helperText={formErrors.purpose || "Describe what this bot does"}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleInputChange}
                  >
                    <MenuItem key="active" value="active">Active</MenuItem>
                    <MenuItem key="inactive" value="inactive">Inactive</MenuItem>
                    <MenuItem key="suspended" value="suspended">Suspended</MenuItem>
                    <MenuItem key="pending" value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook URL"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleInputChange}
                  variant="outlined"
                  placeholder="https://your-webhook.com/endpoint"
                  helperText={formErrors.webhookUrl || "Optional URL for external bot integration"}
                  error={!!formErrors.webhookUrl}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={24} />
            ) : (
              editingBot ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'warning' ? 10000 : 6000}  // Longer duration for warnings
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
          {rateLimited && (
            <Button 
              size="small" 
              color="inherit" 
              sx={{ ml: 1 }}
              onClick={() => {
                if (retryTimeout) {
                  clearTimeout(retryTimeout);
                }
                setRateLimited(false);
                setRetryCount(0);
                setSnackbar({
                  ...snackbar,
                  open: false
                });
              }}
            >
              Try Now
            </Button>
          )}
        </Alert>
      </Snackbar>
      
      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        aria-labelledby="delete-bot-dialog-title"
      >
        <DialogTitle id="delete-bot-dialog-title">
          Confirm Bot Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be undone. To confirm deletion of <strong>{botToDelete?.username}</strong>, please type the bot's username below:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="confirm-username"
            label="Bot Username"
            type="text"
            fullWidth
            value={confirmUsername}
            onChange={(e) => setConfirmUsername(e.target.value)}
            error={!!deleteError}
            helperText={deleteError}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteBot} 
            color="error" 
            variant="contained"
            disabled={!confirmUsername}
          >
            Delete Bot
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bots; 