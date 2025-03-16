import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import './styles.css';

const MapView3D = ({ messages, currentUsername, userLocation, isDarkMode }) => {
  useEffect(() => {
    console.log('MapView3D is deprecated as the main MapView now exclusively uses 3D mode.');
  }, []);

  // Redirect to the main view which now uses 3D exclusively
  return <Navigate to="/" replace />;
};

MapView3D.propTypes = {
  messages: PropTypes.array,
  currentUsername: PropTypes.string,
  userLocation: PropTypes.object,
  isDarkMode: PropTypes.bool
};

MapView3D.defaultProps = {
  messages: [],
  isDarkMode: false
};

export default MapView3D; 