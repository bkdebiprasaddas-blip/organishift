import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const EventTitleContext = createContext(null);

export const EventTitleProvider = ({ children }) => {
  const [titles, setTitles] = useState({});

  // These must be referentially stable: Layout puts the context value in a
  // useEffect dependency list, and a new object every render would re-trigger
  // the effect (and its /api/events fetch) on every single render.
  const setTitle = useCallback((eventId, title) => {
    setTitles(prev => (prev[eventId] === title ? prev : { ...prev, [eventId]: title }));
  }, []);

  const clearTitle = useCallback((eventId) => {
    setTitles(prev => {
      if (!(eventId in prev)) return prev;
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const getTitle = useCallback((eventId) => titles[eventId] || '', [titles]);

  const value = useMemo(
    () => ({ getTitle, setTitle, clearTitle }),
    [getTitle, setTitle, clearTitle]
  );

  return (
    <EventTitleContext.Provider value={value}>
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
