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
  Avatar,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import DataTable from '../components/DataTable';
import { getUsers, deleteUser, updateUser } from '../services/api';
import { SelectChangeEvent } from '@mui/material/Select';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  renderCell?: (props: { row: any; value: any }) => React.ReactNode;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  profilePicture?: string;
  createdAt: string;
  lastSeen: string;
  messagesCount: number;
  followersCount: number;
  followingCount: number;
  isBot?: boolean;
}

const userRoles = [
  { value: 'user', label: 'User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
];

const userStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: '',
    status: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await getUsers();
      console.log('User data:', response.data.data);
      
      // Check if any users have isBot property
      const hasBotsProperty = response.data.data.some((user: any) => 'isBot' in user);
      console.log('Has isBot property:', hasBotsProperty);
      
      // Log the first user with isBot property
      const botUser = response.data.data.find((user: any) => user.isBot === true);
      console.log('Bot user example:', botUser);
      
      setUsers(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load users',
        severity: 'error',
      });
      setLoading(false);
    }
  };

  const handleOpenDialog = (user: User | null = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        role: '',
        status: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (selectedUser) {
        // Update existing user
        await updateUser(selectedUser.id, formData);
        // Update the user in the local state
        setUsers(users.map(user => 
          user.id === selectedUser.id ? { ...user, ...formData, status: formData.status as 'active' | 'inactive' | 'suspended' } : user
        ));
        
        showSnackbar('User updated successfully', 'success');
      } else {
        // This would be for creating a new user, but we're not implementing that now
        showSnackbar('User creation not implemented', 'error');
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      
      // Remove the user from the local state
      setUsers(users.filter(user => user.id !== id));
      
      showSnackbar('User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar('Failed to delete user', 'error');
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

  const getStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case 'active':
        color = 'success';
        break;
      case 'inactive':
        color = 'warning';
        break;
      case 'suspended':
        color = 'error';
        break;
    }
    
    return <Chip label={status} color={color} size="small" />;
  };

  const getRoleChip = (role: string, row: any) => {
    let color: 'primary' | 'secondary' | 'info' | 'default' = 'default';
    let label = role;
    
    // Check if the account is a bot - try different ways to detect bots
    if (row && (row.isBot === true || row.isBot === 'true')) {
      label = 'bot';
      color = 'secondary';
      return <Chip label={label} color={color} size="small" />;
    }
    
    // For human accounts
    switch (role) {
      case 'admin':
        color = 'primary';
        break;
      case 'moderator':
        color = 'secondary';
        break;
      case 'user':
        color = 'info';
        label = 'users'; // Change to "users" for human accounts
        break;
      default:
        label = role || 'users';
        color = 'info';
        break;
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  const columns: Column[] = [
    {
      id: 'username', 
      label: 'Username',
      minWidth: 150,
      renderCell: (props) => {
        const { row } = props;
        if (!row) return null;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              src={row.profilePicture} 
              sx={{ width: 30, height: 30, mr: 1 }}
            >
              {row.username.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2">{row.username}</Typography>
          </Box>
        );
      },
    },
    { id: 'email', label: 'Email', minWidth: 170 },
    { 
      id: 'role', 
      label: 'Role', 
      minWidth: 100,
      renderCell: (props) => {
        const { row, value } = props;
        // If it's a bot, display 'bot'
        if (row && (row.isBot === true || row.isBot === 'true')) {
          return <Chip label="bot" color="secondary" size="small" />;
        }
        // For human accounts, display 'users' if the role is 'user'
        if (value === 'user') {
          return <Chip label="users" color="info" size="small" />;
        }
        // For other roles (admin, moderator), display the role as is
        return getRoleChip(value, row);
      },
    },
    {
      id: 'isBot',
      label: 'Account Type',
      minWidth: 120,
      renderCell: (props) => {
        const { row } = props;
        const isBot = row && (row.isBot === true || row.isBot === 'true');
        return (
          <Chip 
            label={isBot ? 'Bot' : 'Human'} 
            color={isBot ? 'secondary' : 'info'} 
            size="small" 
          />
        );
      },
    },
    { 
      id: 'status', 
      label: 'Status', 
      minWidth: 100,
      renderCell: (props) => getStatusChip(props.value),
    },
    { 
      id: 'createdAt', 
      label: 'Created At', 
      minWidth: 120,
      format: (value) => new Date(value).toLocaleDateString(),
    },
    { 
      id: 'lastSeen', 
      label: 'Last Seen', 
      minWidth: 120,
      format: (value) => new Date(value).toLocaleDateString(),
    },
    { 
      id: 'messagesCount', 
      label: 'Messages', 
      minWidth: 100,
      align: 'right',
    },
    { 
      id: 'followersCount', 
      label: 'Followers', 
      minWidth: 100,
      align: 'right',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchUsers}
        >
          Refresh
        </Button>
      </Box>
      <DataTable
        columns={columns}
        rows={users}
        title="Users"
        onEdit={(id) => handleOpenDialog(users.find(user => user.id === id) || null)}
        onDelete={handleDeleteUser}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
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
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  {userRoles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleInputChange}
                >
                  {userStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users; 
