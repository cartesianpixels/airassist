"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginButton } from "@/components/auth/LoginButton";
import { AppHeader } from "@/components/app-header";
import { ModernSidebar } from "@/components/modern-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Clock, TrendingUp, Settings, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabaseChat } from "@/hooks/useSupabaseChat";
import type { Profile } from "@/lib/supabase-typed";

// Helper function to generate personalized questions based on user profile
function getPersonalizedQuestions(metadata: any) {
  const role = metadata?.role || 'student';
  const experience = metadata?.experience || 'beginner';
  const interests = metadata?.interests || [];

  const questionSets = {
    student: {
      beginner: [
        "What are the basic requirements to become a pilot?",
        "Can you explain the difference between VFR and IFR flying?",
        "What are the main components of an aircraft control system?",
        "How do I read a sectional chart for navigation?"
      ],
      intermediate: [
        "What are the weather minimums for VFR flight?",
        "Explain the process of filing a flight plan",
        "How do radio communications work in controlled airspace?",
        "What should I know about cross-country flight planning?"
      ],
      advanced: [
        "What are the commercial pilot license requirements?",
        "Explain instrument approach procedures",
        "How do you handle emergency situations during flight?",
        "What are the differences between Class B, C, and D airspace?"
      ]
    },
    pilot: {
      beginner: [
        "What are the currency requirements for pilots?",
        "How do I maintain my medical certificate?",
        "What are the recent changes in aviation regulations?",
        "Can you explain night flying requirements?"
      ],
      intermediate: [
        "What are the requirements for an instrument rating?",
        "How do I plan for weather-related flight diversions?",
        "Explain the use of GPS for navigation",
        "What are the insurance requirements for aircraft ownership?"
      ],
      advanced: [
        "What are the ATP requirements and training?",
        "How do I transition to turbine aircraft?",
        "Explain high-altitude flight operations",
        "What are the regulatory requirements for commercial operations?"
      ]
    },
    controller: {
      beginner: [
        "What are the basic air traffic control phraseology standards?",
        "How do you handle aircraft separation requirements?",
        "Explain the different types of radar services",
        "What are the emergency procedures for controllers?"
      ],
      intermediate: [
        "How do you manage traffic flow in busy airspace?",
        "Explain approach and departure procedures",
        "What are the weather minimums for different operations?",
        "How do you coordinate with other control facilities?"
      ],
      advanced: [
        "What are the procedures for handling system failures?",
        "Explain complex airspace management scenarios",
        "How do you handle multiple emergency situations?",
        "What are the latest NextGen implementation procedures?"
      ]
    },
    instructor: {
      beginner: [
        "What are the requirements to become a CFI?",
        "How do you structure effective flight lessons?",
        "What are the best practices for ground instruction?",
        "How do you handle student pilot challenges?"
      ],
      intermediate: [
        "How do you prepare students for their checkrides?",
        "What are effective methods for teaching complex maneuvers?",
        "How do you handle different learning styles?",
        "What are the insurance requirements for flight instruction?"
      ],
      advanced: [
        "How do you transition to teaching in complex aircraft?",
        "What are the requirements for CFII and MEI ratings?",
        "How do you maintain currency as an instructor?",
        "What are the best practices for safety management in training?"
      ]
    }
  };

  // Get base questions for role and experience
  let baseQuestions = questionSets[role as keyof typeof questionSets]?.[experience as keyof typeof questionSets.student] || questionSets.student.beginner;

  // Filter by interests if available
  if (interests.length > 0) {
    const interestKeywords = {
      'IFR Procedures': ['IFR', 'instrument', 'approach'],
      'VFR Operations': ['VFR', 'visual', 'sectional'],
      'Weather Analysis': ['weather', 'minimums', 'conditions'],
      'Navigation': ['navigation', 'GPS', 'chart'],
      'Emergency Procedures': ['emergency', 'failure', 'procedures'],
      'Aircraft Systems': ['aircraft', 'systems', 'components'],
      'Regulations (FAR/AIM)': ['regulations', 'requirements', 'currency'],
      'Airport Operations': ['airport', 'airspace', 'traffic']
    };

    // Prioritize questions that match user interests
    const matchedQuestions = baseQuestions.filter((question: string) =>
      interests.some((interest: string) => {
        const keywords = interestKeywords[interest as keyof typeof interestKeywords] || [];
        return keywords.some((keyword: string) =>
          question.toLowerCase().includes(keyword.toLowerCase())
        );
      })
    );

    if (matchedQuestions.length >= 2) {
      return matchedQuestions.slice(0, 4);
    }
  }

  return baseQuestions.slice(0, 4);
}

function DashboardPage() {
  const { user, loading, profile, profileLoading } = useAuth();
  const router = useRouter();
  const { sessions, loadChatSessions } = useSupabaseChat();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isNewUser, setIsNewUser] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user, loadChatSessions]);

  React.useEffect(() => {
    if (profile && sessions.length !== undefined) {
      // Check if user just completed onboarding (created within last 24 hours and has no sessions)
      const accountAge = Date.now() - new Date(profile.created_at).getTime();
      const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // 24 hours
      const newUserStatus = isNewAccount && sessions.length === 0;
      setIsNewUser(newUserStatus);
    }
  }, [profile, sessions]);


  // Show loading screen
  if (loading || profileLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show login screen for unauthenticated users
  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
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
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-slate-800 dark:text-slate-200"
                >
                  Welcome to ATC Assistant
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-600 dark:text-slate-400"
                >
                  Please sign in to access your dashboard
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo="/dashboard"
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((acc, session) => acc + session.message_count, 0);
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sidebar */}
      <ModernSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSessionSelect={(sessionId) => {
          if (sessionId === "new") {
            router.push("/chat");
          } else {
            router.push(`/chat/${sessionId}`);
          }
        }}
      />

      {/* Header */}
      <AppHeader
        title="AirAssist Dashboard"
        subtitle="Analytics & Chat Management"
        onSidebarToggle={() => setSidebarOpen(true)}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Hero Section with Prominent Chat Start */}
          <div className="relative">
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 rounded-3xl blur-3xl"></div>

            <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl p-8 md:p-12">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full border border-emerald-500/30 dark:border-emerald-400/30">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">AirAssist Dashboard</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 bg-clip-text text-transparent leading-tight">
                  {isNewUser ? 'Welcome to AirAssist,' : 'Welcome back,'}
                  <br />
                  <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                  {isNewUser && '! 🎉'}
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  {isNewUser
                    ? `Great job completing the onboarding! As a ${profile?.metadata?.role || 'student'} with ${profile?.metadata?.experience || 'beginner'} experience, you're ready to start your aviation learning journey.`
                    : 'Ready to practice ATC procedures? Start a new conversation or continue from where you left off.'
                  }
                </p>

                {/* Primary CTA */}
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    onClick={async () => {
                      console.log('New chat button clicked');
                      try {
                        const { createChatSession } = await import('@/lib/database-supabase');
                        console.log('About to create session for user:', user.id);
                        const sessionId = await createChatSession("New Chat Session", user.id);
                        console.log('Session created:', sessionId);
                        router.push(`/chat/${sessionId}`);
                      } catch (error) {
                        console.error('Error creating session:', error);
                        alert('Error creating chat session: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      }
                    }}
                    className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0"
                    size="lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      {isNewUser ? 'Start Your First Chat!' : 'Start New Chat Session'}
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-200 font-medium rounded-2xl transition-all duration-300"
                    onClick={() => {
                      const sessionsSection = document.getElementById('recent-sessions');
                      sessionsSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <BarChart3 className="w-5 h-5 mr-2" />
                    View Recent Chats
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>


          {/* Modern Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-white/90 to-emerald-50/50 dark:from-slate-800/90 dark:to-emerald-900/20 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-500/30 rounded-2xl hover:border-emerald-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{totalSessions}</div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Total Conversations</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {totalMessages} total messages exchanged
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-white/90 to-cyan-50/50 dark:from-slate-800/90 dark:to-cyan-900/20 backdrop-blur-sm border border-cyan-200/50 dark:border-cyan-500/30 rounded-2xl hover:border-cyan-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">+{Math.min(totalSessions, 12)}</div>
                    <div className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">This Week</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  New conversations started
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-white/90 to-blue-50/50 dark:from-slate-800/90 dark:to-blue-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-500/30 rounded-2xl hover:border-blue-400/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Avg. Session</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Messages per conversation
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Sessions - Modern Design */}
          <motion.div
            id="recent-sessions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recent Conversations</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Continue where you left off</p>
                </div>
              </div>
            </div>

            {recentSessions.length > 0 ? (
              <div className="grid gap-4">
                {recentSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="group relative cursor-pointer"
                    onClick={() => router.push(`/chat/${session.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative p-6 bg-gradient-to-br from-white/90 to-slate-50/50 dark:from-slate-800/90 dark:to-slate-700/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 rounded-2xl hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {session.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                {session.message_count} messages
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(session.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl">
                            Continue →
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {sessions.length > 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-center pt-6"
                  >
                    <Button
                      variant="outline"
                      className="px-6 py-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl transition-all duration-300"
                    >
                      View All {sessions.length} Conversations
                    </Button>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center py-16"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                    <MessageSquare className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-full blur-2xl"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Ready to start chatting?
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  Begin your first ATC conversation and practice real-world scenarios
                </p>
                <Button
                  onClick={async () => {
                    try {
                      const { createChatSession } = await import('@/lib/database-supabase');
                      const sessionId = await createChatSession("New Chat Session", user.id);
                      router.push(`/chat/${sessionId}`);
                    } catch (error) {
                      console.error('Error creating session:', error);
                    }
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  size="lg"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Start Your First Chat
                </Button>
              </motion.div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

export default function DashboardPageWithAuth() {
  return <DashboardPage />;
}