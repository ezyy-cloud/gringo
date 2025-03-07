import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import DataTable from '../components/DataTable';
import { getMessages, getMessage, deleteMessage } from '../services/api';

interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  createdAt: string;
  location: string;
  likes: number;
  isApiMessage: boolean;
}

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const response = await getMessages();
      setMessages(response.data.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load messages',
        severity: 'error',
      });
      setLoading(false);
    }
  };

  const handleViewMessage = (id: string) => {
    const message = messages.find((msg) => msg.id === id);
    if (message) {
      setSelectedMessage(message);
      setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMessage(null);
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage(id);
      
      // Remove the message from the local state
      setMessages(messages.filter(message => message.id !== id));
      
      showSnackbar('Message deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showSnackbar('Failed to delete message', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  const columns = [
    { id: 'username', label: 'User', minWidth: 120 },
    {
      id: 'content',
      label: 'Content',
      minWidth: 300,
      format: (value: string) => (
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {value}
        </Typography>
      ),
    },
    {
      id: 'isApiMessage',
      label: 'Type',
      minWidth: 100,
      format: (value: boolean) => (
        <Chip
          label={value ? 'Bot' : 'User'}
          color={value ? 'secondary' : 'primary'}
          size="small"
        />
      ),
    },
    { id: 'location', label: 'Location', minWidth: 120 },
    { id: 'likes', label: 'Likes', minWidth: 80, align: 'right' as const },
    {
      id: 'createdAt',
      label: 'Created At',
      minWidth: 160,
      format: (value: string) => formatDateTime(value),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Message Management</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchMessages}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={messages}
          title="Messages"
          onEdit={handleViewMessage}
          onDelete={handleDeleteMessage}
        />
      )}

      {/* Message View Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Message Details</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="User"
                value={selectedMessage.username}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Content"
                value={selectedMessage.content}
                fullWidth
                margin="normal"
                multiline
                rows={4}
                InputProps={{ readOnly: true }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Location"
                  value={selectedMessage.location}
                  fullWidth
                  margin="normal"
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="Created At"
                  value={formatDateTime(selectedMessage.createdAt)}
                  fullWidth
                  margin="normal"
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="Likes"
                  value={selectedMessage.likes}
                  fullWidth
                  margin="normal"
                  InputProps={{ readOnly: true }}
                />
              </Box>
              <TextField
                label="Type"
                value={selectedMessage.isApiMessage ? 'Bot Message' : 'User Message'}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button
            onClick={() => {
              if (selectedMessage) {
                handleDeleteMessage(selectedMessage.id);
                handleCloseDialog();
              }
            }}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Messages; 