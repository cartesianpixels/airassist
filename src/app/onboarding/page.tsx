"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { LoginButton } from "@/components/auth/LoginButton";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

function OnboardingPage() {
  const { user, loading, hasCompletedOnboarding } = useAuth();
  const router = useRouter();

  console.log('🎬 ONBOARDING PAGE:', {
    hasUser: !!user,
    loading,
    hasCompletedOnboarding,
    userMetadata: user?.user_metadata
  });

  // Check if user has already completed onboarding
  React.useEffect(() => {
    console.log('🔄 Onboarding completion check:', { hasCompletedOnboarding });
    if (hasCompletedOnboarding) {
      console.log('✅ User has completed onboarding - redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [hasCompletedOnboarding, router]);

  // Show loading screen
  if (loading) {
    return (
      <div className="h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center shadow-xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen for unauthenticated users
  if (!user) {
    return (
      <div className="h-screen gradient-bg">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex justify-center"
              >
                <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center shadow-xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-foreground"
                >
                  Welcome to AirAssist
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-foreground-secondary"
                >
                  Please sign in to begin the onboarding process
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo="/onboarding"
                  className="w-full gradient-brand text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return <OnboardingFlow />;
}

export default function OnboardingPageWithAuth() {
  return <OnboardingPage />;
}