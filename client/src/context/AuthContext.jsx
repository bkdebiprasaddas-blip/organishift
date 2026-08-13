import { createContext, useContext, useEffect, useState } from 'react';
import http from '../api/http';

const AuthContext = createContext(null);

const TOKEN_KEY = 'organishift_token';
const USER_KEY = 'organishift_user';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    setLoading(true);
    http
      .get('/auth/me')
      .then((res) => {
        if (!mounted) return;
        const freshUser = res.data.data.user;
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      })
      .catch(() => {
        if (!mounted) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const applySession = (userData, newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setToken(newToken);
  };

  const login = async (email, password) => {
    const res = await http.post('/auth/login', { email, password });
    const { user: userData, token: newToken } = res.data.data;
    applySession(userData, newToken);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await http.post('/auth/register', { name, email, password });
    const { user: userData, token: newToken } = res.data.data;
    applySession(userData, newToken);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
