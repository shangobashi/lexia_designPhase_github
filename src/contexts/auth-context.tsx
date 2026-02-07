import * as React from 'react';
import { createContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getProfile, Profile } from '@/lib/supabase';
import { getGuestSession } from '@/lib/guest-session';

// Types
export type User = {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  profile?: Profile;
  isGuest?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: () => Promise<void>;
  microsoftLogin: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  continueAsGuest: () => void;
};

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const continueAsGuest = () => {
    const guestSession = getGuestSession();
    const remaining = Math.max(0, guestSession.maxQueries - guestSession.queriesUsed);

    const guestUser: User = {
      id: 'guest-user',
      email: 'guest@kingsley.com',
      displayName: null,
      photoURL: null,
      isGuest: true,
      profile: {
        id: 'guest-user',
        email: 'guest@kingsley.com',
        full_name: null,
        avatar_url: null,
        subscription_status: 'trialing',
        subscription_plan: 'free',
        credits_remaining: remaining,
        trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stripe_customer_id: null,
        paypal_customer_id: null
      }
    };
    setUser(guestUser);
    setLoading(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured - entering guest-only mode');
      setLoading(false);
      return;
    }

    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else if (session?.user) {
        await handleUserSession(session.user);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);

        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = async (supabaseUser: SupabaseUser) => {
    try {
      const profile = await getProfile(supabaseUser.id);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: profile.full_name,
        photoURL: profile.avatar_url,
        profile
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: supabaseUser.user_metadata?.full_name || null,
        photoURL: null
      });
    }
  };

  const ensureSupabase = () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase non configuré - mode invité uniquement');
    }
  };

  const login = async (email: string, password: string) => {
    ensureSupabase();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        await handleUserSession(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    ensureSupabase();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (error) throw error;

      if (data.user && !data.session) {
        // Auto-confirm is enabled — try signing in immediately
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error('Compte créé. Veuillez vous connecter avec vos identifiants.');
        }
        if (signInData.user) {
          await handleUserSession(signInData.user);
        }
      } else if (data.user && data.session) {
        await handleUserSession(data.user);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    ensureSupabase();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const microsoftLogin = async () => {
    ensureSupabase();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Microsoft login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    ensureSupabase();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    ensureSupabase();
    if (!user) throw new Error('No user logged in');

    try {
      const authUpdates: any = {};
      if (data.displayName) {
        authUpdates.data = { full_name: data.displayName };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }

      const profileUpdates: any = {};
      if (data.displayName) profileUpdates.full_name = data.displayName;
      if (data.photoURL) profileUpdates.avatar_url = data.photoURL;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      await handleUserSession(await supabase.auth.getUser().then(({ data }) => data.user!));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    googleLogin,
    microsoftLogin,
    resetPassword,
    updateProfile,
    continueAsGuest
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
