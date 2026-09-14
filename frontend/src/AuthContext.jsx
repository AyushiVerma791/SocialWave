import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data.success) {
      const { token, userId, username, email: resEmail } = res.data.data;
      const userData = { userId, username, email: resEmail };
      setToken(token);
      setUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Ensure profile exists or sync it
      try {
        await userAPI.getProfile(userId);
      } catch (e) {
        if (e.response?.status === 404) {
          // If auth exists but profile doesn't (rare but possible), create it
          await userAPI.updateProfile(userId, { _id: userId, username });
        }
      }
      return true;
    }
    return false;
  };

  const register = async (username, email, password) => {
    const res = await authAPI.register({ username, email, password });
    if (res.data.success) {
      const { token, userId } = res.data.data;
      const userData = { userId, username, email };
      setToken(token);
      setUser(userData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Create user profile in user-service
      try {
        await userAPI.updateProfile(userId, { _id: userId, username });
      } catch (e) {
        console.error("Profile creation failed, trying creation endpoint", e);
        // We used POST to create profile
        await axios.post('http://localhost:4008/user', { _id: userId, username }, { headers: { Authorization: `Bearer ${token}` } });
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
