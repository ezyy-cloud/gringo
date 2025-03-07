import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logoSvg from '../assets/logo.svg';
import './LandingPage.css';

// Map with animated dots representing users
const AnimatedMap = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let dots = [];
    
    // Set canvas size
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initDots();
    };
    
    // Create dots representing users
    const initDots = () => {
      const dotCount = Math.floor(canvas.width * canvas.height / 15000);
      dots = Array(dotCount).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 3 + Math.random() * 3,
        color: `rgba(29, 161, 242, ${0.3 + Math.random() * 0.7})`,
        speedX: Math.random() * 2 - 1,
        speedY: Math.random() * 2 - 1,
        pulseSpeed: 0.02 + Math.random() * 0.04,
        pulseDir: 1,
        pulseSize: 0
      }));
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw map-like background
      ctx.fillStyle = 'rgba(29, 161, 242, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw dots
      dots.forEach(dot => {
        // Move dots
        dot.x += dot.speedX;
        dot.y += dot.speedY;
        
        // Bounce off edges
        if (dot.x < 0 || dot.x > canvas.width) dot.speedX *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.speedY *= -1;
        
        // Pulse effect
        dot.pulseSize += dot.pulseSpeed * dot.pulseDir;
        if (dot.pulseSize > 1) dot.pulseDir = -1;
        else if (dot.pulseSize < 0) dot.pulseDir = 1;
        
        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius * (1 + dot.pulseSize * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
        
        // Draw connection lines between nearby dots
        dots.forEach(otherDot => {
          const dx = dot.x - otherDot.x;
          const dy = dot.y - otherDot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(otherDot.x, otherDot.y);
            ctx.strokeStyle = `rgba(29, 161, 242, ${0.1 * (1 - distance / 100)})`;
            ctx.stroke();
          }
        });
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Initialize
    window.addEventListener('resize', resize);
    resize();
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="animated-map"></canvas>;
};

const FeatureItem = ({ icon, title, description }) => (
  <div className="feature-item">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

FeatureItem.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired
};

const LandingPage = ({ isDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className={`landing-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="landing-logo">
          <img src={logoSvg} alt="Gringo Logo" />
          <h1>Gringo</h1>
        </div>
        <nav className="landing-nav">
          <Link to="/auth" className="auth-button login-button">Login</Link>
          <Link to="/auth?tab=register" className="auth-button register-button">Sign Up</Link>
        </nav>
      </header>
      
      <div className="content-container">
        <section className="hero-section">
          <div className="hero-content">
            <h1>Discover what's happening around you, right now</h1>
            <p>Gringo connects you with real-time updates and experiences from people nearby. Share moments, discover local gems, and connect with your community.</p>
            <Link to="/auth?tab=register" className="hero-button">Get Started</Link>
          </div>
          <div className="hero-visual">
            <AnimatedMap />
          </div>
        </section>
        
        <section className="features-section">
          <h2>Why Choose Gringo?</h2>
          <div className="features-grid">
            <FeatureItem 
              icon="📍"
              title="Real-time Geolocation"
              description="Discover what's happening near you right now with precise location tracking."
            />
            <FeatureItem 
              icon="📱"
              title="Mobile-First Experience"
              description="Designed for on-the-go usage with a responsive interface that works on any device."
            />
            <FeatureItem 
              icon="🔔"
              title="Instant Notifications"
              description="Stay updated with real-time alerts about activity in your area."
            />
            <FeatureItem 
              icon="🌐"
              title="Connect Locally"
              description="Build connections with people and places in your community."
            />
            <FeatureItem 
              icon="📸"
              title="Rich Media Sharing"
              description="Share photos and videos of what's happening around you."
            />
            <FeatureItem 
              icon="🔒"
              title="Privacy Controls"
              description="Choose how and when to share your location with customizable privacy settings."
            />
          </div>
        </section>
        
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to explore your world?</h2>
            <p>Join thousands of users already discovering and sharing exciting moments around them.</p>
            <Link to="/auth?tab=register" className="cta-button">Create Your Account</Link>
          </div>
        </section>
        
        <footer className="landing-footer">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} Gringo. All rights reserved.</p>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact Us</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

LandingPage.propTypes = {
  isDarkMode: PropTypes.bool
};

LandingPage.defaultProps = {
  isDarkMode: false
};

export default LandingPage; 