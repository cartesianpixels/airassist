"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Brain, Zap } from "lucide-react";

interface ThinkingIndicatorProps {
  isStreaming?: boolean;
  currentContent?: string;
  realThinkingMessage?: string;
}

export function ThinkingIndicator({
  isStreaming = false,
  currentContent = "",
  realThinkingMessage = ""
}: ThinkingIndicatorProps) {
  const fallbackStreamingMessages = [
    "✍️ Writing response...",
    "📖 Referencing sources...",
  ];

  const fallbackThinkingMessages = [
    "🤖 Processing your question...",
    "🔍 Searching documentation...",
  ];

  const [fallbackMessage, setFallbackMessage] = React.useState("");

  // Use real thinking message if available, otherwise use fallback
  const displayMessage = realThinkingMessage || fallbackMessage;

  React.useEffect(() => {
    // Only use fallback messages when no real thinking message is available
    if (!realThinkingMessage) {
      const messages = isStreaming ? fallbackStreamingMessages : fallbackThinkingMessages;
      setFallbackMessage(messages[0]);

      const interval = setInterval(() => {
        setFallbackMessage((prev) => {
          const currentIndex = messages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % messages.length;
          return messages[nextIndex];
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isStreaming, realThinkingMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-center"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-lg px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Thinking animation */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-1, 1, -1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
              />
            ))}
          </div>

          {/* Current action */}
          <motion.div
            key={currentMessage}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: isStreaming ? [0, 360] : [0, 5, -5, 0] }}
              transition={{
                duration: isStreaming ? 2 : 1,
                repeat: Infinity,
                ease: isStreaming ? "linear" : "easeInOut"
              }}
            >
              {isStreaming ? (
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Brain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              )}
            </motion.div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {displayMessage}
            </span>
          </motion.div>

          {/* Content length indicator */}
          {isStreaming && currentContent && (
            <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
              <span>•</span>
              <span>{currentContent.length} chars</span>
            </div>
          )}

          {/* Mini progress bar */}
          <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
              animate={{
                x: ["-100%", "100%"]
              }}
              transition={{
                duration: isStreaming ? 1 : 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}