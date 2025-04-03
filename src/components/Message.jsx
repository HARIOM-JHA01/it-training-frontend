import React from 'react';
import './Message.css';

const Message = ({ role, content }) => {
  const timestamp = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className={`message ${role}`}>
      <div className="message-role">
        {role === 'user' ? 'You' : 'Internal Client'}
      </div>
      <div className="message-content">
        {content}
      </div>
      <div className="message-time">
        {timestamp}
      </div>
    </div>
  );
};

export default Message;
  