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

const Users = ({ users, onDeleteUser }) => {
  if (!users || users.length === 0) {
    return <Typography variant="body1">No users found.</Typography>;
  }

  // Debug the first user object to see its structure
  console.log('First user object:', users[0]);
  
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user, index) => {
            // Log each user to help debug
            console.log(`User ${index}:`, user);
            
            return (
              <TableRow key={user.id || index}>
                <TableCell>{user.id || 'N/A'}</TableCell>
                <TableCell>{user.username || user.name || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>{user.role || 'N/A'}</TableCell>
                <TableCell>
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    color="error" 
                    size="small"
                    onClick={() => onDeleteUser(user.id)}
                    disabled={!user.id}
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
          {JSON.stringify(users, null, 2)}
        </pre>
      </Box>
    </TableContainer>
  );
};

export default Users; 