import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { Session } from '@supabase/supabase-js';

export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;          // auth.users id (= users.id)
  employee_id?: string; // employees.id (set for EMPLOYEE role)
  name: string;
  email: string;
  role: Role;
  company_id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fetch the user's profile from our backend using the session JWT. */
async function fetchUserProfile(): Promise<User | null> {
  try {
    // Get session to know user id and email
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const userEmail = session.user.email || '';

    // Use the /me endpoint to get role and company info
    const me = await api.get<{
      user_id: string;
      role: Role;
      company_id: string;
      employee_id: string | null;
    }>('/me');

    return {
      id: me.user_id,
      employee_id: me.employee_id || undefined,
      name: userEmail.split('@')[0], // We can fetch name from /employees later if needed, or rely on Profile
      email: userEmail,
      role: me.role,
      company_id: me.company_id,
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await fetchUserProfile();
    if (!profile) {
      // If we have a session but failed to load the profile (e.g. user missing from DB),
      // we must sign out to prevent a login loop where the user is stuck on the sign-in page.
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadProfile(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will fire and call loadProfile
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
