"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { LoginButton } from "@/components/auth/LoginButton";
import { AppHeader } from "@/components/app-header";
import { ModernSidebar } from "@/components/modern-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, MessageSquare, Plus, Clock, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useSupabaseChat } from "@/hooks/useSupabaseChat";
import { createChatSession } from "@/lib/database-supabase";

function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sessions, loadChatSessions } = useSupabaseChat();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [creatingSession, setCreatingSession] = React.useState(false);

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
          <p className="text-slate-600 dark:text-slate-400">Loading chat...</p>
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
                  ATC Training Chat
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-600 dark:text-slate-400"
                >
                  Please sign in to start training
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo="/chat"
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSession = async () => {
    if (!user?.id) return;

    try {
      setCreatingSession(true);
      const sessionId = await createChatSession("New Training Session", user.id);
      router.push(`/chat/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sidebar */}
      <ModernSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSessionSelect={(sessionId) => {
          if (sessionId === "new") {
            handleCreateSession();
          } else {
            router.push(`/chat/${sessionId}`);
          }
        }}
      />

      {/* Header */}
      <AppHeader
        title="ATC Training Chat"
        subtitle="Practice scenarios and improve your skills"
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
              Ready for ATC Training?
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Start a new training session or continue from where you left off.
            </p>
          </div>

          {/* New Session Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-strong border-brand-primary/50 hover-lift">
              <CardHeader className="text-center">
                <CardTitle className="text-brand-primary flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Start New Training Session
                </CardTitle>
                <CardDescription>
                  Begin a fresh ATC training conversation with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  onClick={handleCreateSession}
                  disabled={creatingSession}
                  className="w-full max-w-md gradient-brand text-white shadow-brand hover:shadow-glow transition-all duration-300"
                  size="lg"
                >
                  {creatingSession ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 mr-2" />
                      New Training Session
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Bar */}
          {sessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative max-w-md mx-auto"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass border-border/50"
              />
            </motion.div>
          )}

          {/* Sessions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {searchQuery ? `Search Results (${filteredSessions.length})` : 'Your Conversations'}
                </CardTitle>
                <CardDescription>
                  {searchQuery
                    ? `Showing conversations matching "${searchQuery}"`
                    : 'Continue your ATC training from previous sessions'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSessions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredSessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg glass border-border/30 hover:border-border/60 hover-lift transition-all duration-300 cursor-pointer group"
                        onClick={() => router.push(`/chat/${session.id}`)}
                      >
                        <div className="space-y-2 flex-1">
                          <h4 className="font-medium text-foreground group-hover:text-brand-primary transition-colors">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-foreground-secondary">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {session.message_count} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(session.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Continue
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto mb-4 shadow-brand">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </h3>
                    <p className="text-foreground-secondary mb-4">
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Start your first ATC training conversation'
                      }
                    </p>
                    {searchQuery ? (
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear Search
                      </Button>
                    ) : (
                      <Button onClick={handleCreateSession} disabled={creatingSession}>
                        {creatingSession ? 'Creating...' : 'Start Training'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChatPageWithAuth() {
  return (
    <AuthProvider>
      <ChatPage />
    </AuthProvider>
  );
}