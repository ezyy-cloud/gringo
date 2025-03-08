import PropTypes from 'prop-types';
import './styles.css';

const ConnectionStatus = ({ isConnected }) => {
  return (
    <div className="connection-status">
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
      <div className="status-text">
        {isConnected ? 'Connected to server' : 'Disconnected'}
      </div>
    </div>
  );
};

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool
};

ConnectionStatus.defaultProps = {
  isConnected: false
};

export default ConnectionStatus; 