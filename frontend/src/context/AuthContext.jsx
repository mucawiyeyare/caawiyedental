import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, getMeApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dentalhub_user') || localStorage.getItem('snab_dental_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('dentalhub_token') || localStorage.getItem('snab_dental_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await getMeApi();
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('dentalhub_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await loginApi({ username, password });
      if (res.data.success) {
        const { token: jwtToken, user: userData } = res.data;
        setToken(jwtToken);
        setUser(userData);
        localStorage.setItem('dentalhub_token', jwtToken);
        localStorage.setItem('dentalhub_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dentalhub_token');
    localStorage.removeItem('dentalhub_user');
    localStorage.removeItem('snab_dental_token');
    localStorage.removeItem('snab_dental_user');
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isSuperAdmin = Boolean(user?.is_super_admin || user?.role === 'Super Admin');

  /**
   * Checks if a module is enabled for the current tenant.
   * Super Admins have access to everything.
   * If enabledModules is not loaded yet or empty, defaults to true for safety.
   */
  const isFeatureEnabled = (moduleKey) => {
    if (isSuperAdmin) return true;
    if (!user?.enabledModules || user.enabledModules.length === 0) return true;
    return user.enabledModules.includes(moduleKey);
  };

  const tenant = user?.tenant || null;

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('dentalhub_user', JSON.stringify(userData));
  };

  const updateTenantBranding = (tenantUpdates) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      tenant: {
        ...(user.tenant || {}),
        ...tenantUpdates
      }
    };
    setUser(updatedUser);
    localStorage.setItem('dentalhub_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        updateTenantBranding,
        token,
        loading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isFeatureEnabled,
        tenant
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
