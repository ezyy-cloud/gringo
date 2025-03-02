import PropTypes from 'prop-types';
import { GoLocation } from "react-icons/go";
import './MessageModal.css'; // We're using styles from this file

const FloatingActionButton = ({ onClick, isDarkMode }) => {
  return (
    <button 
      className={`floating-action-button ${isDarkMode ? 'dark-mode' : ''}`} 
      onClick={onClick} 
      aria-label="Create new message"
    >
      <GoLocation size={24} />
    </button>
  );
};

FloatingActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

FloatingActionButton.defaultProps = {
  isDarkMode: false
};

export default FloatingActionButton; 