"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { ChatForm } from "@/components/chat-form";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import type { Message } from "@/lib/types";
import { useOpenAIChat } from "@/hooks/use-openai-chat";
import { Sparkles, Send, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastActivity: Date;
}

export default function Home() {
  const [chatHistory, setChatHistory] = React.useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const { streamingState, sendMessage, reset } = useOpenAIChat({
    onChunk: (chunk) => {
      console.log('Chunk received:', chunk.substring(0, 50));
    },
    onComplete: (finalContent, messageId) => {
      console.log('Streaming complete, final content:', finalContent?.substring(0, 100) + '...');
      console.log('Streaming complete, length:', finalContent?.length || 0);
      console.log('Received messageId:', messageId);
      console.log('Current streamingMessageId:', streamingMessageId);
      setIsThinking(false);
      handleStreamingComplete(finalContent, messageId);
    },
    onError: (error) => {
      console.error('Streaming error:', error);
      setIsThinking(false);
      setStreamingMessageId(null);
      if (streamingMessageId) {
        setMessages(prev => prev.filter(m => m.id !== streamingMessageId));
      }
    }
  });

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingState.currentContent, isThinking, scrollToBottom]);

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || streamingState.isStreaming) return;

    let currentChatId = activeChatId;

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Create or update chat session
    if (!activeChatId) {
      const newChat: ChatSession = {
        id: String(Date.now()),
        title: input.substring(0, 30) + (input.length > 30 ? "..." : ""),
        messages: newMessages,
        lastActivity: new Date(),
      };
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
      setChatHistory(prev => [newChat, ...prev]);
    } else {
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: newMessages, lastActivity: new Date() }
            : chat
        )
      );
    }

    // Show thinking indicator
    setIsThinking(true);

    // Create streaming message placeholder
    const newStreamingId = String(Date.now() + 1);
    setStreamingMessageId(newStreamingId);

    const assistantMessage: Message = {
      id: newStreamingId,
      role: "assistant",
      content: "",
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      await sendMessage(
        newMessages.map(({ id, ...rest }) => rest),
        newStreamingId // Pass the streaming message ID
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsThinking(false);
      setMessages(prev => prev.filter(m => m.id !== newStreamingId));
      setStreamingMessageId(null);
    }
  };

  const handleStreamingComplete = (finalContent: string, messageId?: string) => {
    const targetMessageId = messageId || streamingMessageId;
    if (!targetMessageId) {
      console.warn('No message ID available for completion');
      return;
    }

    const completedMessage: Message = {
      id: targetMessageId,
      role: "assistant",
      content: finalContent,
    };

    setMessages(prev => {
      const updatedMessages = prev.map(msg =>
        msg.id === targetMessageId ? completedMessage : msg
      );

      // Update chat history with the updated messages
      setChatHistory(chatPrev =>
        chatPrev.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...updatedMessages], lastActivity: new Date() }
            : chat
        )
      );

      return updatedMessages;
    });

    setStreamingMessageId(null);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setStreamingMessageId(null);
    reset();
  };

  const loadChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chat.id);
      setMessages(chat.messages);
      setStreamingMessageId(null);
      reset();
    }
  };

  const handleStopStreaming = () => {
    setStreamingMessageId(null);
    reset();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed left-0 top-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 z-50 lg:relative lg:translate-x-0"
            >
              <ChatSidebar
                chatHistory={chatHistory}
                activeChatId={activeChatId}
                onNewChat={handleNewChat}
                onLoadChat={loadChat}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className={cn("flex flex-col h-full", sidebarOpen && "lg:ml-80")}>
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-30 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-800 dark:text-slate-200">ATC Assistant</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">AI-Powered Aviation Guidance</p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

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
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Welcome to ATC Assistant
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
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
                        className="p-4 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-300">{prompt}</span>
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
          className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/60 p-4"
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