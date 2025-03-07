import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, getCurrentUser, checkAdmin } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Add a small artificial delay to ensure proper state processing
        // This replaces the unintentional delay from console.log statements
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Get user data
        const userResponse = await getCurrentUser();
        
        // Ensure we have valid data before proceeding
        if (!userResponse || !userResponse.data) {
          throw new Error('Invalid user response');
        }
        
        // Another small delay for state stability
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Check if the user is an admin
        try {
          const adminResponse = await checkAdmin();
          if (adminResponse.data.isAdmin) {
            // User is an admin, set user data
            setUser({
              ...userResponse.data,
              role: 'admin'
            });
          } else {
            // User is not an admin, log out
            localStorage.removeItem('token');
            setUser(null);
            navigate('/login');
          }
        } catch (adminError) {
          localStorage.removeItem('token');
          setUser(null);
          navigate('/login');
        }
      } catch (error) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      // Add a small artificial delay to ensure proper state processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const response = await apiLogin(email, password);
      
      // Ensure we have a valid response before proceeding
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Another small delay for state stability
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Extract token and user from the nested data object
      const { token, user } = response.data.data || {};
      
      if (!token || !user) {
        throw new Error('Invalid response format from server');
      }
      
      localStorage.setItem('token', token);
      
      // Check if the user is an admin
      try {
        const adminResponse = await checkAdmin();
        
        // Add a brief delay before checking the response
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (adminResponse.data.isAdmin) {
          // Create a new admin user object to prevent reference issues
          const adminUser = {
            ...user,
            role: 'admin'
          };
          
          setUser(adminUser);
        } else {
          throw new Error('User does not have admin permissions');
        }
      } catch (adminError) {
        // Clean up if admin check fails
        localStorage.removeItem('token');
        throw new Error('You do not have permission to access the admin panel');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 