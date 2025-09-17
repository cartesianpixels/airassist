import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Profile } from '@/lib/supabase-typed';

export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profiles?.[0] as Profile || null;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

export async function getUserTier(userId: string): Promise<'free' | 'basic' | 'pro' | 'enterprise'> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId);

    if (error) {
      console.error('Error fetching user tier:', error);
      return 'free';
    }

    return profiles?.[0]?.tier || 'free';
  } catch (error) {
    console.error('Error in getUserTier:', error);
    return 'free';
  }
}