import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api/client';

const STORAGE_KEY = '@dogpaw_session';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
};

type UserContextType = {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  registerUser: (email: string, name: string, password: string) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { token: string; user: CurrentUser };
        setAuthToken(parsed.token);
        const me = await api.me();
        const current: CurrentUser = { id: me.id, name: me.name, email: me.email, is_admin: me.is_admin };
        setUser(current);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: parsed.token, user: current }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки пользователя');
      setAuthToken(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const full = await api.getUser(user.id);
      const current: CurrentUser = { id: full.id, name: full.name, email: full.email, is_admin: full.is_admin };
      setUser(current);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const token = stored ? (JSON.parse(stored) as { token?: string }).token : undefined;
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: current }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (email: string, name: string, password: string) => {
    setError(null);
    try {
      const resp = await api.register({ email: email.trim(), name: name.trim(), password });
      setAuthToken(resp.token);
      const current: CurrentUser = { id: resp.user.id, name: resp.user.name, email: resp.user.email, is_admin: resp.user.is_admin };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: resp.token, user: current }));
      setUser(current);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка регистрации';
      setError(msg);
      throw e;
    }
  };

  const loginUser = async (email: string, password: string) => {
    setError(null);
    try {
      const resp = await api.login({ email: email.trim(), password });
      setAuthToken(resp.token);
      const current: CurrentUser = { id: resp.user.id, name: resp.user.name, email: resp.user.email, is_admin: resp.user.is_admin };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: resp.token, user: current }));
      setUser(current);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка входа';
      setError(msg);
      throw e;
    }
  };

  const logoutUser = async () => {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, registerUser, loginUser, logoutUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
