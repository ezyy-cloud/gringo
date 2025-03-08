import { useState } from 'react';
import PropTypes from 'prop-types';
import authService from '../../services/authService';

const LoginForm = ({ onLoginSuccess, isDarkMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted with username:', username);
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Calling authService.login...');
      const result = await authService.login({ credential: username, password });
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful, calling onLoginSuccess with user:', result.data.user);
        onLoginSuccess(result.data.user);
      } else {
        console.error('Login failed:', result.message);
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError(error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className={`auth-form ${isDarkMode ? 'dark-mode' : ''}`} onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          autoComplete="username"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>
      
      <button 
        type="submit" 
        className="auth-button"
        disabled={isLoading}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

LoginForm.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

LoginForm.defaultProps = {
  isDarkMode: false
};

export default LoginForm; 