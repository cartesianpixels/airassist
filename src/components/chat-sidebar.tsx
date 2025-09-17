"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/components/auth/AuthProvider';
import { useSupabaseChat, ChatSession } from '@/hooks/useSupabaseChat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  History,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  className?: string;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string | null;
  onClose?: () => void;
}

export function ChatSidebar({
  className,
  onSessionSelect,
  currentSessionId,
  onClose
}: ChatSidebarProps) {
  const { user } = useAuth();
  const {
    sessions,
    loading,
    error,
    loadChatSessions,
    updateSessionTitle,
    deleteSession,
    startNewChat,
  } = useSupabaseChat();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const LIMIT = 20;

  // Load initial sessions
  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user, loadChatSessions]);

  // Infinite scroll handler
  const handleScroll = useCallback(async () => {
    if (!scrollRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setLoadingMore(true);

      try {
        const newOffset = offset + LIMIT;
        await loadChatSessions(LIMIT, newOffset, true); // append=true for infinite scroll

        // Check if we got less than the limit, meaning no more data
        if (sessions.length < newOffset + LIMIT) {
          setHasMore(false);
        }
        setOffset(newOffset);
      } catch (error) {
        console.error('Error loading more sessions:', error);
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, hasMore, offset, loadChatSessions, sessions.length]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleNewChat = () => {
    startNewChat();
    if (onSessionSelect) {
      onSessionSelect('new');
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleEditStart = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleEditSave = async () => {
    if (editingSessionId && editTitle.trim()) {
      await updateSessionTitle(editingSessionId, editTitle.trim());
      setEditingSessionId(null);
      setEditTitle('');
    }
  };

  const handleEditCancel = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return null;
  }

  return (
    <div className={cn(
      "w-80 h-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-200/60 flex flex-col shadow-sm",
      className
    )}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-blue-50 to-purple-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">AirAssist</h2>
              <p className="text-xs text-gray-600">Chat Sessions</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Button
          onClick={handleNewChat}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          size="sm"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </motion.div>

      {/* Sessions List */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-2">
          {loading && sessions.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSessionClick(session.id)}
              className={cn(
                "group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                currentSessionId === session.id
                  ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingSessionId === session.id ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                      onBlur={handleEditSave}
                      className="h-6 text-sm p-1 border-blue-300"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className={cn(
                      "text-sm font-medium truncate",
                      currentSessionId === session.id ? "text-blue-800" : "text-gray-800"
                    )}>
                      {session.title}
                    </h3>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <MessageSquare className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {session.message_count} messages
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(session.last_message_at || session.created_at)}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => handleEditStart(session)}>
                      <Edit3 className="w-3 h-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(session.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}

          {/* Load More Indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading more...</span>
            </div>
          )}

          {/* No More Sessions */}
          {!hasMore && sessions.length > 0 && (
            <div className="text-center py-4">
              <span className="text-xs text-gray-400">No more sessions</span>
            </div>
          )}

          {/* Empty State */}
          {sessions.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">No chat sessions yet</p>
              <p className="text-xs text-gray-400">Start a new conversation to begin</p>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 border-t border-gray-200/60 bg-gradient-to-r from-gray-50 to-white"
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Connected to Supabase</span>
        </div>
      </motion.div>
    </div>
  );
}