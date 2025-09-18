"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase-typed';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  hasCompletedOnboarding: boolean;
  userTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => false,
  hasCompletedOnboarding: false,
  userTier: 'free',
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);

      const { data: profiles, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profiles) {
        setProfile(profiles as Profile);
      } else {
        // Profile doesn't exist, it will be created by the database trigger
        console.log('Profile not found, will be created by trigger');
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Refresh profile after update
      await refreshProfile();
      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let profileLoaded = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.id && !profileLoaded) {
        profileLoaded = true;
        loadProfile(session.user.id);
      } else {
        setProfileLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileLoading(false);
        profileLoaded = false;
      }
      // Don't load profile on auth state changes - only on initial session
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasCompletedOnboarding = Boolean(
    profile?.onboarding_completed ||
    profile?.metadata?.onboarding_completed
  );

  const userTier = profile?.tier || 'free';

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    signOut,
    refreshProfile,
    updateProfile,
    hasCompletedOnboarding,
    userTier,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}