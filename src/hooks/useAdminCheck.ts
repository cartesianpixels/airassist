import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabaseApi } from '@/lib/api-client';

// Cache admin status to avoid repeated database calls
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAdminCheck() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check cache first
      const cached = adminCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setIsAdmin(cached.isAdmin);
        setLoading(false);
        return;
      }

      try {
        // Use optimized Supabase client with built-in caching
        const { data: profile, error } = await supabaseApi.getProfile(user.id, ['role']);

        if (error || !profile) {
          console.log('No profile found for admin check');
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const adminStatus = profile.role === 'admin' ||
                           user.email?.includes('admin') || // Fallback for development
                           false;

        // Cache the result
        adminCache.set(user.id, { isAdmin: adminStatus, timestamp: Date.now() });

        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}