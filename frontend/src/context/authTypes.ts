import { createContext } from 'react';

export type UserRole = 'admin' | 'finance' | 'operations';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
