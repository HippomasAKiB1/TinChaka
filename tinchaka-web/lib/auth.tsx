'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';

export type UserRole = 'PASSENGER' | 'DRIVER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Session {
  token: string;
  user: User;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextType {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  signup: (input: SignupInput) => Promise<Session>;
  logout: () => void;
  isLoading: boolean;
}

const STORAGE_KEY = 'tinchaka.session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        if (parsed?.token && parsed?.user) {
          setSession(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<Session> => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const newSession: Session = {
      token: data.token,
      user: data.user,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return newSession;
  };

  const signup = async (input: SignupInput): Promise<Session> => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: input,
    });

    const newSession: Session = {
      token: data.token,
      user: data.user,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return newSession;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
