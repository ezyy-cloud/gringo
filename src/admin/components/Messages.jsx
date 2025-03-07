import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Button,
  Typography,
  Box
} from '@mui/material';

const Messages = ({ messages, onDeleteMessage }) => {
  if (!messages || messages.length === 0) {
    return <Typography variant="body1">No messages found.</Typography>;
  }

  // Debug the first message object to see its structure
  console.log('First message object:', messages[0]);
  
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Sender</TableCell>
            <TableCell>Recipient</TableCell>
            <TableCell>Content</TableCell>
            <TableCell>Sent At</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {messages.map((message, index) => {
            // Log each message to help debug
            console.log(`Message ${index}:`, message);
            
            return (
              <TableRow key={message.id || index}>
                <TableCell>{message.id || 'N/A'}</TableCell>
                <TableCell>
                  {message.sender?.username || 
                   message.senderName || 
                   message.senderId || 
                   'N/A'}
                </TableCell>
                <TableCell>
                  {message.recipient?.username || 
                   message.recipientName || 
                   message.recipientId || 
                   'N/A'}
                </TableCell>
                <TableCell>{message.content || message.text || message.body || 'N/A'}</TableCell>
                <TableCell>
                  {message.createdAt ? new Date(message.createdAt).toLocaleString() : 
                   message.sentAt ? new Date(message.sentAt).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    color="error" 
                    size="small"
                    onClick={() => onDeleteMessage(message.id)}
                    disabled={!message.id}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Add a debug section to show raw data */}
      <Box mt={3} p={2} sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>Debug Information:</Typography>
        <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
          {JSON.stringify(messages, null, 2)}
        </pre>
      </Box>
    </TableContainer>
  );
};

export default Messages; 