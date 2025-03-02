import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation, Link } from 'react-router-dom';
import logoSvg from '../../assets/logo.svg';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './AuthForms.css';

const Auth = ({ onAuthSuccess, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Check for tab query parameter on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    }
  }, [location.search]);

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`auth-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Navbar for auth pages */}
      <div className={`auth-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="auth-navbar-content">
          <Link to="/" className="back-to-home">← Home</Link>
          <div className="auth-logo">
            <img src={logoSvg} alt="Gringo Logo" />
            <h1>Gringo</h1>
          </div>
        </div>
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