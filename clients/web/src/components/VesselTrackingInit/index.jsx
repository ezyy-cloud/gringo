import { useState } from 'react';
import PropTypes from 'prop-types';
import vesselService from '../../services/vesselService';
import './styles.css';

const VesselTrackingInit = ({ onInitialized }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInitialize = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await vesselService.initializeTracking();
      
      if (response.success) {
        setSuccess(true);
        if (onInitialized) {
          onInitialized(true);
        }
      } else {
        setError(response.message || 'Failed to initialize vessel tracking');
      }
    } catch (err) {
      console.error('Error initializing vessel tracking:', err);
      
      // Provide more helpful error messages based on the error
      if (err.response?.status === 500) {
        setError('Server configuration error. Please contact an administrator.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to initialize vessel tracking');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="vessel-tracking-init vessel-tracking-success">
        <h3>Vessel Tracking Initialized</h3>
        <p>Vessel tracking has been successfully initialized. You should start seeing vessel data on the map shortly.</p>
        <p>Note: If no vessels appear, it could be because:</p>
        <ul>
          <li>There are no vessels in the current map view</li>
          <li>The API key has usage limitations</li>
          <li>The AISStream.io service might be experiencing issues</li>
        </ul>
        <p>The connection status is shown at the bottom of the map.</p>
      </div>
    );
  }

  return (
    <div className="vessel-tracking-init">
      <h3>Enable Vessel Tracking</h3>
      <p>Click the button below to enable real-time vessel tracking on the map.</p>
      
      {error && (
        <div className="vessel-tracking-error">
          {error}
        </div>
      )}
      
      <button 
        onClick={handleInitialize} 
        className="vessel-tracking-button"
        disabled={loading}
      >
        {loading ? 'Initializing...' : 'Enable Vessel Tracking'}
      </button>
      
      <div className="vessel-tracking-info">
        <p>Vessel tracking is powered by AISStream.io, providing real-time marine vessel data.</p>
        <p>The system uses a server-side API key, so you don't need to provide your own credentials.</p>
      </div>
    </div>
  );
};

VesselTrackingInit.propTypes = {
  onInitialized: PropTypes.func
};

export default VesselTrackingInit; 