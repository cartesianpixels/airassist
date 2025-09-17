"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase-typed';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';

interface LoginButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({ redirectTo = '/', className, children }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
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
      {children ? (
        children
      ) : (
        <>
          <Chrome className="w-5 h-5 mr-2" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </>
      )}
    </Button>
  );
}