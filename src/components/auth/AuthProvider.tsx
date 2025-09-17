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


  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setProfileLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);

      if (error) {
        console.error('Error refreshing profile:', error);
        setProfileLoading(false);
        return;
      }

      if (profiles && profiles.length > 0) {
        setProfile(profiles[0] as Profile);
      }
      setProfileLoading(false);
    } catch (error) {
      console.error('Error in refreshProfile:', error);
      setProfileLoading(false);
    }
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    try {
      setProfile(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);

      const { error } = await (supabase as any)
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    const loadProfileForUser = async (userId: string) => {
      try {
        setProfileLoading(true);
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId);

        if (error) {
          console.error('Error fetching profile:', error);
          setProfileLoading(false);
          return null;
        }

        if (!profiles || profiles.length === 0) {
          console.log('No profile found, attempting to create one for user:', userId);

          // First try using the database function (if available)
          try {
            const { data: funcResult, error: funcError } = await supabase.rpc('create_user_profile', {
              user_id: userId,
              user_email: user?.email || '',
              user_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
              avatar_url: user?.user_metadata?.avatar_url || null
            });

            if (!funcError && funcResult) {
              console.log('Profile created via database function:', funcResult);
              setProfile(funcResult as Profile);
              setProfileLoading(false);
              return funcResult as Profile;
            }

            console.log('Database function not available or failed, trying direct insert');
          } catch (funcErr) {
            console.log('Database function error, falling back to direct insert:', funcErr);
          }

          // Fallback to direct insert
          const defaultProfile: Partial<Profile> = {
            id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
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
            console.error('Profile creation failed:', {
              code: createError.code,
              message: createError.message,
              hint: createError.hint,
              details: createError.details
            });

            console.warn('Profile creation failed - user can complete setup later');
            setProfileLoading(false);
            return null;
          }

          console.log('Profile created via direct insert:', newProfile);
          setProfile(newProfile as Profile);
          setProfileLoading(false);
          return newProfile as Profile;
        }

        setProfile(profiles[0] as Profile);
        setProfileLoading(false);
        return profiles[0] as Profile;
      } catch (error) {
        console.error('Error in loadProfileForUser:', error);
        setProfileLoading(false);
        return null;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.id) {
        await loadProfileForUser(session.user.id);
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
        const userProfile = await loadProfileForUser(session.user.id);

        if (userProfile) {
          try {
            const { error } = await (supabase as any)
              .from('profiles')
              .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', session.user.id);

            if (error) {
              console.error('Error updating last_login:', error);
            }
          } catch (error) {
            console.error('Error in last_login update:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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