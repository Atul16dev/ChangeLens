import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser, logoutUser, registerUser, verifyEmailOtp, updateUserProfile } from '../services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCurrentUser();
      setUser(res.data?.user || null);
      setError(null);
    } catch (err) {
      // 401 just means visitor is not logged in; clean state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await loginUser({ email, password });
    if (res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    return await registerUser(payload);
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    setError(null);
    const res = await verifyEmailOtp({ email, otp });
    if (res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    setError(null);
    const res = await updateUserProfile(data);
    if (res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isEmailVerified: Boolean(user?.is_email_verified),
    login,
    register,
    verifyEmail,
    logout,
    updateProfile,
    refreshUser,
    setUser,
    error,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
