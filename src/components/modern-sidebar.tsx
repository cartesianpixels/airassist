"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSupabaseChat, ChatSession } from "@/hooks/useSupabaseChat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  PlusCircle,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  X,
  Search,
  Clock,
  Zap,
  Settings,
  LogOut,
  User,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string | null;
}

export function ModernSidebar({
  isOpen,
  onClose,
  onSessionSelect,
  currentSessionId,
}: ModernSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    sessions,
    loading,
    error,
    loadChatSessions,
    updateSessionTitle,
    deleteSession,
    startNewChat,
  } = useSupabaseChat();

  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Load sessions when user is authenticated
  React.useEffect(() => {
    if (user && isOpen) {
      loadChatSessions();
    }
  }, [user, isOpen, loadChatSessions]);

  const filteredSessions = React.useMemo(() => {
    if (!searchQuery) return sessions;
    return sessions.filter(session =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  const handleNewChat = async () => {
    try {
      const { createChatSession } = await import('@/lib/database-supabase');
      const sessionId = await createChatSession("New Chat Session", user?.id || '');
      router.push(`/chat/${sessionId}`);
      onClose();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
    onClose();
  };

  const handleEditStart = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleEditSave = async () => {
    if (editingSessionId && editTitle.trim()) {
      await updateSessionTitle(editingSessionId, editTitle.trim());
      setEditingSessionId(null);
      setEditTitle("");
    }
  };

  const handleEditCancel = () => {
    setEditingSessionId(null);
    setEditTitle("");
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-80 z-50 flex flex-col"
          >
            <div className="glass-strong h-full border-r border-border/50 shadow-xl flex flex-col">
              {/* Top Content */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-brand"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">AirAssist</h2>
                      <p className="text-xs text-foreground-muted">AI Assistant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="w-8 h-8 hover:bg-surface-hover text-foreground-muted hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* New Chat Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleNewChat}
                    className="w-full gradient-brand text-white shadow-brand hover:shadow-glow transition-all duration-300"
                    size="lg"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    New Chat
                  </Button>
                </motion.div>

                {/* Dashboard Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-3">
                  <Button
                    onClick={() => {
                      router.push("/dashboard");
                      onClose();
                    }}
                    variant="outline"
                    className="w-full glass-strong border-brand-primary/30 hover:border-brand-primary text-brand-primary hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-300"
                    size="lg"
                  >
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Dashboard
                  </Button>
                </motion.div>

                {/* Search */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass border-border/50 focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {loading && sessions.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                        <p className="text-sm text-foreground-muted">Loading conversations...</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  {filteredSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSessionClick(session.id)}
                      className={cn(
                        "group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer hover-lift",
                        currentSessionId === session.id
                          ? "glass-strong border-brand-primary/50 shadow-brand"
                          : "glass border-border/30 hover:border-border/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave();
                                if (e.key === "Escape") handleEditCancel();
                              }}
                              onBlur={handleEditSave}
                              className="h-7 text-sm border-brand-primary/50"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3
                              className={cn(
                                "font-medium text-sm mb-2 truncate transition-colors",
                                currentSessionId === session.id
                                  ? "text-brand-primary"
                                  : "text-foreground group-hover:text-brand-primary"
                              )}
                            >
                              {session.title}
                            </h3>
                          )}

                          <div className="flex items-center gap-3 text-xs text-foreground-muted">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{session.message_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(session.last_message_at || session.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-hover"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-strong border-border/50">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStart(session);
                              }}
                              className="text-foreground hover:text-brand-primary"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(session.id);
                              }}
                              className="text-error hover:text-error focus:text-error"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Active indicator */}
                      {currentSessionId === session.id && (
                        <motion.div
                          layoutId="activeSession"
                          className="absolute inset-0 rounded-xl border-2 border-brand-primary/50 pointer-events-none"
                        />
                      )}
                    </motion.div>
                  ))}

                  {/* Empty State */}
                  {filteredSessions.length === 0 && !loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto mb-4 shadow-brand">
                        <MessageSquare className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-medium text-foreground mb-2">
                        {searchQuery ? "No matching conversations" : "No conversations yet"}
                      </h3>
                      <p className="text-sm text-foreground-muted mb-4">
                        {searchQuery
                          ? "Try adjusting your search query"
                          : "Start a new conversation to begin chatting"}
                      </p>
                      {!searchQuery && (
                        <Button onClick={handleNewChat} variant="outline" size="sm">
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Start First Chat
                        </Button>
                      )}
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/50">
                {/* Quick Actions */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push("/settings");
                      onClose();
                    }}
                    className="w-full glass border-border/30 hover:border-brand-primary/50 text-foreground-secondary hover:text-brand-primary"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>

                {/* User Info */}
                <div className="flex items-center justify-between p-3 rounded-lg glass border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-foreground-muted truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-8 h-8 text-foreground-muted hover:text-error"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-foreground-subtle">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span>Connected</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}