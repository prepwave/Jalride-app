import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('customer'); // 'customer' | 'owner' | 'admin'

  // Booking draft state preserved across navigation and auth boundaries
  const [bookingDraft, setBookingDraft] = useState({
    boat: null,
    date: null,
    timeSlot: null,
    passengers: 1,
    couponCode: '',
    discountAmount: 0,
    baseFare: 0,
    convenienceFee: 20,
    paymentMethod: 'wallet',
  });

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('jalride_native_token'),
        AsyncStorage.getItem('jalride_native_user'),
      ]);

      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setToken(storedToken);
        setActiveRole(parsed.role || 'customer');
      } else {
        setUser(null);
        setToken(null);
        setActiveRole('customer');
      }
    } catch (e) {
      console.warn('Failed restoring user session:', e);
      setUser(null);
      setToken(null);
      setActiveRole('customer');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res && res.token && res.user) {
        setUser(res.user);
        setToken(res.token);
        // Strictly verify admin role
        if (res.user.role === 'admin' && res.user.email?.toLowerCase().trim() !== 'prepwave.pushpendra@gmail.com') {
          res.user.role = 'customer';
        }
        setActiveRole(res.user.role || 'customer');
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Invalid credentials' };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await api.register(payload);
      if (res && res.success) {
        if (res.token && res.user) {
          setUser(res.user);
          setToken(res.token);
          setActiveRole(res.user.role || 'customer');
        }
        return {
          success: true,
          requiresEmailVerification: res.requiresEmailVerification,
          message: res.message || 'Registration successful',
          user: res.user,
        };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (_) {}
    setUser(null);
    setToken(null);
    setActiveRole('customer');
    resetBookingDraft();
  };

  const switchRole = (newRole) => {
    if (!user) return;
    const isAdmin = user.role === 'admin' && user.email?.toLowerCase().trim() === 'prepwave.pushpendra@gmail.com';
    const isOwner = user.role === 'owner';

    if (newRole === 'admin' && !isAdmin) {
      console.warn('Unauthorized role switch to admin rejected');
      return;
    }
    if (newRole === 'owner' && !isOwner && !isAdmin) {
      console.warn('Unauthorized role switch to owner rejected');
      return;
    }
    setActiveRole(newRole);
  };

  const updateProfile = async (updates) => {
    try {
      const res = await api.updateProfile(updates);
      const updated = res.user || { ...user, ...updates };
      setUser(updated);
      return { success: true, user: updated };
    } catch (e) {
      const updated = { ...user, ...updates };
      setUser(updated);
      return { success: true, user: updated };
    }
  };

  const updateBookingDraft = (fields) => {
    setBookingDraft((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  const resetBookingDraft = () => {
    setBookingDraft({
      boat: null,
      date: null,
      timeSlot: null,
      passengers: 1,
      couponCode: '',
      discountAmount: 0,
      baseFare: 0,
      convenienceFee: 20,
      paymentMethod: 'wallet',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeRole,
        switchRole,
        login,
        register,
        logout,
        updateProfile,
        bookingDraft,
        updateBookingDraft,
        resetBookingDraft,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
