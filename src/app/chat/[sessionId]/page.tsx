"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { ChatForm } from "@/components/chat-form";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { LoginButton } from "@/components/auth/LoginButton";
import { AppHeader } from "@/components/app-header";
import { ModernSidebar } from "@/components/modern-sidebar";
import type { Message } from "@/lib/types";
import { useOpenAIChat } from "@/hooks/use-openai-chat";
import { useSupabaseChat } from "@/hooks/useSupabaseChat";
import { Sparkles, Send, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [streamingMessageId, setStreamingMessageId] = React.useState<string | null>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Supabase chat integration
  const {
    sessions,
    currentSessionId,
    messages,
    loadChatSessions,
    loadChatMessages,
    createNewChatSession,
    addMessage,
    startNewChat,
    setMessages: setSupabaseMessages,
  } = useSupabaseChat();

  // Helper to set current session (from the hook's internal state)
  const setCurrentSessionId = (id: string | null) => {
    if (id === null) {
      startNewChat();
    }
  };

  const { streamingState, sendMessage, reset } = useOpenAIChat({
    onChunk: (chunk) => {
      console.log('Chunk received:', chunk.substring(0, 50));
    },
    onComplete: (finalContent, messageId) => {
      console.log('Streaming complete, final content:', finalContent?.substring(0, 100) + '...');
      setIsThinking(false);
      handleStreamingComplete(finalContent, messageId);
    },
    onError: (error) => {
      console.error('Streaming error:', error);
      setIsThinking(false);
      setStreamingMessageId(null);
      if (streamingMessageId) {
        setSupabaseMessages(prev => prev.filter(m => m.id !== streamingMessageId));
      }
    }
  });

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingState.currentContent, isThinking, scrollToBottom]);

  // Load session messages when sessionId changes
  React.useEffect(() => {
    if (user && sessionId && sessionId !== currentSessionId) {
      loadChatMessages(sessionId).catch((error) => {
        console.error('Session not found or access denied:', error);
        // Redirect to main chat page if session doesn't exist
        router.replace('/chat');
      });
    }
  }, [sessionId, user, currentSessionId, loadChatMessages, router]);

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || streamingState.isStreaming || !user) return;

    try {
      // If no current session, redirect to main chat page
      if (!currentSessionId || currentSessionId !== sessionId) {
        console.log('No valid session, redirecting to main chat page');
        router.replace('/chat');
        return;
      }

      console.log('Adding message to session:', currentSessionId);
      // Add user message to Supabase
      await addMessage(currentSessionId, 'user', input.trim());

      // Show thinking indicator
      setIsThinking(true);

      // Create streaming message placeholder
      const newStreamingId = String(Date.now());
      setStreamingMessageId(newStreamingId);

      const assistantMessage: Message = {
        id: newStreamingId,
        role: "assistant",
        content: "",
      };

      setSupabaseMessages(prev => [...prev, assistantMessage]);

      // Send message to API
      await sendMessage(
        [...messages, { role: 'user' as const, content: input.trim() }].map((msg) => 
          'id' in msg ? { role: msg.role, content: msg.content } : msg
        ),
        newStreamingId
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsThinking(false);
      setStreamingMessageId(null);
    }
  };

  const handleStreamingComplete = async (finalContent: string, messageId?: string) => {
    const targetMessageId = messageId || streamingMessageId;
    if (!targetMessageId || !currentSessionId || !user) {
      console.warn('No message ID, session ID, or user available for completion');
      return;
    }

    try {
      // Save assistant message to Supabase
      await addMessage(currentSessionId, 'assistant', finalContent);

      // Update local state
      const completedMessage: Message = {
        id: targetMessageId,
        role: "assistant",
        content: finalContent,
      };

      setSupabaseMessages(prev =>
        prev.map(msg =>
          msg.id === targetMessageId ? completedMessage : msg
        )
      );

      setStreamingMessageId(null);
    } catch (error) {
      console.error('Error saving completed message:', error);
      setStreamingMessageId(null);
    }
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  const loadChat = async (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleStopStreaming = () => {
    setStreamingMessageId(null);
    reset();
  };

  // Load chat sessions when user is authenticated
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
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
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
                  Your AI-powered aviation guidance companion
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo={`/chat/${sessionId}`}
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen gradient-bg">
      {/* Sidebar */}
      <ModernSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSessionSelect={(sessionId) => {
          if (sessionId === "new") {
            handleNewChat();
          } else {
            loadChat(sessionId);
          }
        }}
        currentSessionId={currentSessionId}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <AppHeader
          title="AirAssist"
          subtitle={`Session: ${sessionId.slice(0, 8)}...`}
          onSidebarToggle={() => setSidebarOpen(true)}
          showSidebarToggle
        />

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto mb-6 shadow-brand">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    New Chat Session
                  </h2>
                  <p className="text-foreground-secondary mb-8 max-w-md mx-auto">
                    Ask me anything about air traffic control procedures, regulations, or flight operations.
                  </p>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {[
                      "What are IFR separation requirements?",
                      "Explain runway incursion procedures",
                      "How do I handle aircraft emergencies?",
                      "What are approach weather minimums?"
                    ].map((prompt, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        onClick={() => handleSendMessage(prompt)}
                        className="p-4 text-left glass-strong rounded-xl border border-border/50 hover:border-brand-primary/50 hover-lift transition-all duration-300"
                      >
                        <span className="text-sm text-foreground">{prompt}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const isCurrentlyStreaming = message.id === streamingMessageId && streamingState.isStreaming;
                      const displayContent = isCurrentlyStreaming ? streamingState.currentContent : message.content;

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <ChatMessage
                            message={{ ...message, content: displayContent }}
                            isStreaming={isCurrentlyStreaming}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Thinking Indicator */}
                  <AnimatePresence>
                    {isThinking && !streamingState.isStreaming && (
                      <ThinkingIndicator />
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky bottom-0 glass-strong border-t border-border/50 p-4"
        >
          <div className="max-w-4xl mx-auto">
            <ChatForm
              onSubmit={handleSendMessage}
              isLoading={streamingState.isStreaming || isThinking}
              onStop={handleStopStreaming}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChatSessionPageWithAuth() {
  return (
    <AuthProvider>
      <ChatSessionPage />
    </AuthProvider>
  );
}