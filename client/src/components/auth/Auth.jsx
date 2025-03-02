import { useState } from 'react';
import PropTypes from 'prop-types';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './AuthForms.css';

const Auth = ({ onAuthSuccess, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <div className={`auth-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Navbar for auth pages */}
      <div className="auth-navbar">
        <h1>Gringo</h1>
      </div>
      
      <div className="auth-content">
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>
        
        {activeTab === 'login' ? (
          <LoginForm onLoginSuccess={onAuthSuccess} isDarkMode={isDarkMode} />
        ) : (
          <RegisterForm 
            onRegisterSuccess={() => setActiveTab('login')} 
            onCancel={() => setActiveTab('login')}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
};

Auth.propTypes = {
  onAuthSuccess: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

Auth.defaultProps = {
  isDarkMode: false
};

export default Auth; 