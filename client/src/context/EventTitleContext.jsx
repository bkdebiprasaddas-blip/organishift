import { createContext, useContext, useState } from 'react';

const EventTitleContext = createContext(null);

export const EventTitleProvider = ({ children }) => {
  const [titles, setTitles] = useState({});

  const setTitle = (eventId, title) => {
    setTitles(prev => ({ ...prev, [eventId]: title }));
  };

  const getTitle = (eventId) => titles[eventId] || '';

  return (
    <EventTitleContext.Provider value={{ getTitle, setTitle }}>
      {children}
    </EventTitleContext.Provider>
  );
};

export const useEventTitle = () => {
  const context = useContext(EventTitleContext);
  if (!context) {
    throw new Error('useEventTitle must be used within an EventTitleProvider');
  }
  return context;
};
