import { createContext, useState } from 'react';
import PropTypes from 'prop-types';

// Create context with default values
export const AppContext = createContext({
  messagesTimestamp: Date.now(),
  setMessagesTimestamp: () => {},
});

// Provider component
export const AppContextProvider = ({ children }) => {
  const [messagesTimestamp, setMessagesTimestamp] = useState(Date.now());

  return (
    <AppContext.Provider
      value={{
        messagesTimestamp,
        setMessagesTimestamp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

AppContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}; 