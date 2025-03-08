import { useState } from 'react';
import PropTypes from 'prop-types';
import './styles.css';

const MessageInput = ({ onSendMessage, placeholder, buttonText }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button 
        type="submit" 
        className="send-button"
        disabled={!message.trim()}
        aria-label={buttonText}
      >
        ➤
      </button>
    </form>
  );
};

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  buttonText: PropTypes.string
};

MessageInput.defaultProps = {
  placeholder: 'Type your message...',
  buttonText: 'Send'
};

export default MessageInput; 