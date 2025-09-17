"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';

interface LoginButtonProps {
  redirectTo?: string;
  className?: string;
}

export function LoginButton({ redirectTo = '/', className }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        console.error('Error signing in:', error.message);
      }
    } catch (error) {
      console.error('Error during sign in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={loading}
      className={className}
      size="lg"
    >
      <Chrome className="w-5 h-5 mr-2" />
      {loading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}