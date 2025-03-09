import axios from 'axios';

// Debug: Log the API URL being used
const apiUrl = import.meta.env.VITE_API_URL || '/api';
console.log('API URL being used:', apiUrl);

// Create axios instance
const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to include the auth token in all requests
api.interceptors.request.use(
  (config) => {
    // Debug: Log the request URL
    if (config.baseURL && config.url) {
      console.log('Making request to:', config.baseURL + config.url);
    } else {
      console.log('Making request:', config);
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // For development, log errors but don't break the app
    console.error('API Error:', error);
    
    // Preserve the full error structure for better handling upstream
    return Promise.reject(error);
  }
);

// Auth
export const login = (email: string, password: string) => 
  api.post('/auth/login', { credential: email, password })
    .catch(error => {
      console.error('Login API error:', error.response?.data || error.message);
      console.error('Full request URL:', api.defaults.baseURL + '/auth/login');
      throw error;
    });
export const getCurrentUser = () => api.get('/auth/me');
export const checkAdmin = () => api.get('/auth/admin');

// Dashboard
export const getDashboardStats = () => api.get('/admin/dashboard');

// Users
export const getUsers = (page = 1, limit = 10) => 
  api.get(`/admin/users?page=${page}&limit=${limit}`);
export const getUser = (id: string) => api.get(`/admin/users/${id}`);
export const updateUser = (id: string, data: any) => api.put(`/admin/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/admin/users/${id}`);

// Bots
export const getBots = (page = 1, limit = 10) => 
  api.get(`/admin/bots?page=${page}&limit=${limit}`)
    .then(response => {
      // No need to handle different response formats here as we're using the main API
      return response;
    })
    .catch(error => {
      console.error('Error fetching bots:', error);
      return Promise.reject(error);
    });
export const getBot = (id: string) => api.get(`/admin/bots/${id}`);
export const createBot = (data: any) => 
  api.post('/admin/bots', data)
    .catch(error => {
      console.error('Error creating bot:', error);
      if (error.response && error.response.data && error.response.data.error) {
        // Extract detailed error message from server response
        error.message = error.response.data.error;
      }
      return Promise.reject(error);
    });
export const updateBot = (id: string, data: any) => 
  api.put(`/admin/bots/${id}`, data)
    .catch(error => {
      console.error('Error updating bot:', error);
      if (error.response && error.response.data && error.response.data.error) {
        // Extract detailed error message from server response
        error.message = error.response.data.error;
      }
      return Promise.reject(error);
    });
export const deleteBot = (id: string) => api.delete(`/admin/bots/${id}`);
export const startBot = (id: string) => api.post(`/admin/bots/${id}/start`);
export const stopBot = (id: string) => api.post(`/admin/bots/${id}/stop`);

// Messages
export const getMessages = (page = 1, limit = 10) => 
  api.get(`/admin/messages?page=${page}&limit=${limit}`);
export const getMessage = (id: string) => api.get(`/admin/messages/${id}`);
export const deleteMessage = (id: string) => api.delete(`/admin/messages/${id}`);

// Analytics
export const getUserAnalytics = (period = 'week') => 
  api.get(`/admin/analytics/users?period=${period}`);
export const getMessageAnalytics = (period = 'week') => 
  api.get(`/admin/analytics/messages?period=${period}`);
export const getBotAnalytics = (period = 'week') => 
  api.get(`/admin/analytics/bots?period=${period}`)
    .catch(error => {
      if (error.response && error.response.status === 404) {
        console.warn('Bot analytics endpoint not found, using mock data');
        // Generate mock data based on the period
        const today = new Date();
        const data = [];
        let daysToGenerate = 7;
        
        if (period === 'day') daysToGenerate = 24; // hours in a day
        else if (period === 'week') daysToGenerate = 7; // days in a week
        else if (period === 'month') daysToGenerate = 30; // ~days in a month
        else if (period === 'year') daysToGenerate = 12; // months in a year
        
        for (let i = 0; i < daysToGenerate; i++) {
          const date = new Date(today);
          if (period === 'day') {
            date.setHours(date.getHours() - i);
          } else if (period === 'year') {
            date.setMonth(date.getMonth() - i);
          } else {
            date.setDate(date.getDate() - i);
          }
          
          const formattedDate = period === 'day' 
            ? `${date.getHours()}:00` 
            : period === 'year'
              ? `${date.toLocaleString('default', { month: 'short' })}`
              : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
              
          data.unshift({
            date: formattedDate,
            count: Math.floor(Math.random() * 100) + 50
          });
        }
        
        return {
          data: {
            data: {
              data,
              total: data.reduce((sum, item) => sum + item.count, 0),
              growth: Math.random() * 30 - 15, // Random growth between -15% and +15%
              byType: [
                { name: 'ChatGPT', value: 45 },
                { name: 'Claude', value: 30 },
                { name: 'Gemini', value: 15 },
                { name: 'Other', value: 10 }
              ]
            }
          }
        };
      }
      throw error;
    });
export const getLocationAnalytics = () => api.get('/admin/analytics/locations');

// Settings
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data: any) => api.put('/admin/settings', data);

export default api; 