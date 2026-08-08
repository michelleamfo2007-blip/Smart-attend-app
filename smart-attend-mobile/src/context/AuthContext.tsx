import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  level?: string;
  semester?: string;
  institution_id?: string;
}
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const AUTH_STORAGE_KEY = '@smartattend_user';
const TOKEN_STORAGE_KEY = '@smartattend_token';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          await supabase.auth.setSession({ access_token: storedToken, refresh_token: '' });
        }
      } catch (err) {
        console.error("Failed to load user session", err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (newUser: User, newToken: string) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setUser(newUser);
      setToken(newToken);
      await supabase.auth.setSession({ access_token: newToken, refresh_token: '' });
    } catch (err) {
      console.error("Failed to save user session", err);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      setToken(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to clear user session", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
