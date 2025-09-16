"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Trash2, X, Sparkles, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  lastActivity: Date;
}

interface ChatSidebarProps {
  chatHistory: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  onClose?: () => void;
}

export function ChatSidebar({
  chatHistory,
  activeChatId,
  onNewChat,
  onLoadChat,
  onClose,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement delete functionality
    console.log("Delete chat:", chatId);
  };

  return (
    <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Chat History</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </motion.div>

      {/* New Chat Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4"
      >
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="font-medium">New Conversation</span>
        </Button>
      </motion.div>

      {/* Chat History */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <History className="w-4 h-4" />
            Recent Chats
          </div>
        </div>

        <ScrollArea className="h-full px-4">
          <AnimatePresence>
            {chatHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No conversations yet
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Start a new chat to begin
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2 pb-4">
                {chatHistory.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onMouseEnter={() => setHoveredId(chat.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onLoadChat(chat.id)}
                    className={cn(
                      "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                      activeChatId === chat.id
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-800/60 border border-transparent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-medium truncate text-sm leading-tight",
                          activeChatId === chat.id
                            ? "text-emerald-800 dark:text-emerald-200"
                            : "text-slate-700 dark:text-slate-300"
                        )}>
                          {chat.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(chat.lastActivity).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <AnimatePresence>
                      {hoveredId === chat.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute top-2 right-2"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 border-t border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ATC Assistant v2.0
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Powered by AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}