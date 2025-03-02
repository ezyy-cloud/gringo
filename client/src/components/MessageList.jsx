import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Message from './Message';
import './MessageList.css';

const MessageList = ({ messages, currentUsername, onlineUsers }) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show all messages (both sent and received)
  // This replaces the previous filtering that was hiding messages
  const filteredMessages = messages;

  return (
    <div className="message-list">
      {filteredMessages.length === 0 ? (
        <div className="no-messages">No messages yet. Start the conversation!</div>
      ) : (
        filteredMessages.map((msg, index) => (
          <Message
            key={index}
            messageId={msg.dbId || msg._id}
            sender={msg.sender}
            content={msg.content}
            timestamp={msg.timestamp}
            isReceived={msg.isReceived}
            location={msg.location}
            isOnline={onlineUsers && onlineUsers[msg.sender]}
            currentUsername={currentUsername}
            likesCount={msg.likesCount || 0}
            likedByCurrentUser={msg.likedByCurrentUser || false}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      isReceived: PropTypes.bool,
      location: PropTypes.object,
      dbId: PropTypes.string,
      _id: PropTypes.string,
      likesCount: PropTypes.number,
      likedByCurrentUser: PropTypes.bool
    })
  ),
  currentUsername: PropTypes.string,
  onlineUsers: PropTypes.object
};

MessageList.defaultProps = {
  messages: [],
  currentUsername: null,
  onlineUsers: {}
};

export default MessageList; 