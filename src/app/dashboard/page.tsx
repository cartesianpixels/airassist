"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { LoginButton } from "@/components/auth/LoginButton";
import { AppHeader } from "@/components/app-header";
import { ModernSidebar } from "@/components/modern-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Clock, TrendingUp, Settings, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabaseChat } from "@/hooks/useSupabaseChat";

function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sessions, loadChatSessions } = useSupabaseChat();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user, loadChatSessions]);

  // Show loading screen
  if (loading) {
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
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Track your ATC training progress, review chat history, and manage your learning journey.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalMessages} total messages
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{Math.min(totalSessions, 12)}</div>
                  <p className="text-xs text-muted-foreground">
                    New conversations
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Session</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Messages per conversation
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Recent Conversations
                </CardTitle>
                <CardDescription>
                  Your latest ATC training sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentSessions.length > 0 ? (
                  <div className="space-y-4">
                    {recentSessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg glass border-border/30 hover:border-border/60 hover-lift transition-all duration-300 cursor-pointer"
                        onClick={() => router.push(`/chat/${session.id}`)}
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground">
                            {session.title}
                          </h4>
                          <p className="text-sm text-foreground-secondary">
                            {session.message_count} messages • {new Date(session.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
                      </motion.div>
                    ))}
                    
                    {sessions.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" onClick={() => router.push('/chat')}>
                          View All Conversations ({sessions.length})
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto mb-4 shadow-brand">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">
                      No conversations yet
                    </h3>
                    <p className="text-foreground-secondary mb-4">
                      Start your first ATC training conversation
                    </p>
                    <Button onClick={() => router.push('/chat')}>
                      Start New Chat
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <Card className="glass-strong border-brand-primary/30 hover-lift">
              <CardHeader>
                <CardTitle className="text-brand-primary">Quick Start</CardTitle>
                <CardDescription className="text-foreground-secondary">
                  Jump into ATC training
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push('/chat')}
                  className="w-full gradient-brand text-white shadow-brand hover:shadow-glow transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Training Session
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-strong border-brand-secondary/30 hover-lift">
              <CardHeader>
                <CardTitle className="text-brand-secondary">Settings</CardTitle>
                <CardDescription className="text-foreground-secondary">
                  Customize your experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => router.push('/settings')}
                  className="w-full glass border-brand-secondary/50 text-brand-secondary hover:bg-brand-secondary/10 hover:border-brand-secondary transition-all duration-300"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Preferences
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function DashboardPageWithAuth() {
  return (
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  );
}