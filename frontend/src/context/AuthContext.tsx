import React, { useState, useEffect } from 'react';
import { AuthContext, type User, type LoginResult } from './authTypes';

const AUTH_STORAGE_KEY = 'elevate_user_session';
const AUTH_TOKEN_KEY = 'elevate_auth_token';

// Kredensial akun resmi yang terdaftar pada sistem
const AUTHORIZED_ACCOUNTS: Array<{ email: string; pass: string; user: User }> = [
  {
    email: 'admin@elevate.id',
    pass: 'elevate2026',
    user: {
      id: 'usr-admin',
      name: 'Super Admin',
      email: 'admin@elevate.id',
      role: 'admin',
      title: 'Portal Administrator',
    },
  },
  {
    email: 'finance@elevate.id',
    pass: 'elevate2026',
    user: {
      id: 'usr-finance',
      name: 'Tim Finance',
      email: 'finance@elevate.id',
      role: 'finance',
      title: 'Finance & Settlement Analyst',
    },
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return null;
  });

  const isAuthenticated = user !== null;

  useEffect(() => {
    // Sinkronisasi status sesi saat berpindah tab browser
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else {
          try {
            setUser(JSON.parse(e.newValue) as User);
          } catch {
            setUser(null);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string, rememberMe = true): Promise<LoginResult> => {
    // Simulasi latensi jaringan ringan agar proses otentikasi terasa natural
    await new Promise((resolve) => setTimeout(resolve, 350));

    const cleanEmail = email.trim().toLowerCase();
    const account = AUTHORIZED_ACCOUNTS.find(
      (acc) => acc.email.toLowerCase() === cleanEmail && acc.pass === password
    );

    if (!account) {
      return {
        success: false,
        error: 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.',
      };
    }

    setUser(account.user);

    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account.user));
      localStorage.setItem(AUTH_TOKEN_KEY, `elevate_token_${account.user.id}_${Date.now()}`);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account.user));
      sessionStorage.setItem(AUTH_TOKEN_KEY, `elevate_token_${account.user.id}_${Date.now()}`);
    }

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
