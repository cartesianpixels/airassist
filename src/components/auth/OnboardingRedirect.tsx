"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  React.useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user || loading) {
        setProfileLoading(false);
        return;
      }

      // Skip onboarding check for auth-related pages
      if (
        pathname.startsWith('/auth') ||
        pathname === '/onboarding' ||
        pathname === '/'
      ) {
        setProfileLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, metadata')
          .eq('id', user.id);

        if (error) {
          console.error('Error checking profile:', error);
          setProfileLoading(false);
          return;
        }

        // Handle new users without profiles
        if (!profiles || profiles.length === 0) {
          console.log('No profile found, assuming new user needs onboarding');
          router.push('/onboarding');
          return;
        }

        const profile = profiles[0];

        // Check if user needs onboarding
        const needsOnboarding = !profile?.onboarding_completed &&
                               !profile?.metadata?.onboarding_completed;

        if (needsOnboarding) {
          setShouldRedirect(true);
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error in onboarding check:', error);
      } finally {
        setProfileLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [user, loading, pathname, router]);

  // Show loading state while checking
  if (loading || profileLoading) {
    return (
      <div className="h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center shadow-xl animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full opacity-30" />
          </div>
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if redirecting to onboarding
  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}