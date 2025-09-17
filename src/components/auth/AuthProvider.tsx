"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase-typed';

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

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      setProfileLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!profiles || profiles.length === 0) {
        const defaultProfile: Partial<Profile> = {
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || null,
          avatar_url: user?.user_metadata?.avatar_url || null,
          tier: 'free',
          role: 'user',
          is_active: true,
          onboarding_completed: false,
          total_tokens_used: 0,
          total_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newProfile, error: createError } = await (supabase as any)
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return null;
        }

        return newProfile as Profile;
      }

      return profiles[0] as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const freshProfile = await fetchProfile(user.id);
    setProfile(freshProfile);
  }, [user?.id, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user?.id || !profile) return false;

    try {
      setProfile(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);

      const { error } = await (supabase as any)
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        await refreshProfile();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      await refreshProfile();
      return false;
    }
  }, [user?.id, profile, supabase, refreshProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.id) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfileLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session?.user?.id) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);

        if (userProfile) {
          await updateProfile({ last_login: new Date().toISOString() });
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchProfile, updateProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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