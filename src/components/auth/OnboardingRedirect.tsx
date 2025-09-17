"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";

export function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading, hasCompletedOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  React.useEffect(() => {
    console.log('🔄 ONBOARDING REDIRECT CHECK:', {
      pathname,
      loading,
      profileLoading,
      hasUser: !!user,
      hasCompletedOnboarding,
      shouldSkipCheck: pathname.startsWith('/auth') || pathname === '/onboarding' || pathname === '/api'
    });

    if (loading || profileLoading) {
      console.log('⏳ Still loading, skipping redirect check');
      return;
    }

    // Skip onboarding check for auth-related pages
    if (
      pathname.startsWith('/auth') ||
      pathname === '/onboarding' ||
      pathname === '/api'
    ) {
      console.log('🚫 Skipping onboarding check for protected path:', pathname);
      return;
    }

    // If user is logged in but hasn't completed onboarding
    if (user && !hasCompletedOnboarding) {
      console.log('🎯 User needs onboarding - redirecting...');
      setShouldRedirect(true);
      router.replace('/onboarding');
    } else if (user && hasCompletedOnboarding) {
      console.log('✅ User has completed onboarding - allowing access');
    } else if (!user) {
      console.log('👤 No user found');
    }
  }, [user, loading, profileLoading, hasCompletedOnboarding, pathname, router]);

  // Show loading spinner while checking
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Don't render children if we're redirecting
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}