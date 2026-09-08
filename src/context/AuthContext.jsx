import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aurawave_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('aurawave_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync token and user in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('aurawave_token', token);
    } else {
      localStorage.removeItem('aurawave_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('aurawave_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('aurawave_user');
    }
  }, [user]);

  // Check auth on initial mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('aurawave_token');
      if (storedToken) {
        try {
          const res = await api.get('/users/me');
          if (res.data?.success) {
            setUser(res.data.data);
          }
        } catch (err) {
          console.warn('Initial session check failed:', err.message);
          // Don't log out immediately on network glitch
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { user: userData, accessToken } = res.data.data;
      setUser(userData);
      setToken(accessToken);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    return res.data;
  };

  const verifyOTP = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res.data?.success) {
      const { user: userData, accessToken } = res.data.data;
      setUser(userData);
      setToken(accessToken);
      return res.data;
    }
    throw new Error(res.data?.message || 'OTP verification failed');
  };

  const resendOTP = async (email) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('aurawave_token');
    localStorage.removeItem('aurawave_user');
  };

  const updateProfile = async (data) => {
    const res = await api.put('/users', data);
    if (res.data?.success) {
      setUser(res.data.data);
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Update failed');
  };

  const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.put('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data?.success) {
      setUser(res.data.data);
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Avatar upload failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        logout,
        updateProfile,
        updateAvatar,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
