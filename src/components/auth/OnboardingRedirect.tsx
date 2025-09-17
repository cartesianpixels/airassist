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
    if (loading || profileLoading) return;

    // Skip onboarding check for auth-related pages
    if (
      pathname.startsWith('/auth') ||
      pathname === '/onboarding' ||
      pathname === '/api'
    ) {
      return;
    }

    // If user is logged in but hasn't completed onboarding
    if (user && !hasCompletedOnboarding) {
      setShouldRedirect(true);
      router.replace('/onboarding');
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