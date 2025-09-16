
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Paperclip, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatFormProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
  className?: string;
}

export function ChatForm({ onSubmit, isLoading = false, onStop, className }: ChatFormProps) {
  const [input, setInput] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "inherit";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const canSubmit = input.trim().length > 0 && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full", className)}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative rounded-2xl border-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-200 shadow-lg",
            isFocused
              ? "border-emerald-400 shadow-emerald-100/50 dark:shadow-emerald-900/20"
              : "border-slate-200 dark:border-slate-700"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask about ATC procedures, regulations, or flight operations..."
            className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-4 pr-32 text-base placeholder:text-slate-500 dark:placeholder:text-slate-400"
            disabled={isLoading}
          />

          {/* Action buttons */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Attachment button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                disabled={isLoading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Voice input button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                disabled={isLoading}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Send/Stop button */}
            {isLoading && onStop ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  onClick={onStop}
                  size="icon"
                  className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white shadow-lg"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={canSubmit ? { scale: 1.05 } : {}}
                whileTap={canSubmit ? { scale: 0.95 } : {}}
              >
                <Button
                  type="submit"
                  size="icon"
                  disabled={!canSubmit}
                  className={cn(
                    "h-8 w-8 shadow-lg transition-all duration-200",
                    canSubmit
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Helper text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono">Enter</kbd> to send,
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono ml-1">Shift+Enter</kbd> for new line
          </div>
          <div className={cn(
            "text-xs transition-colors",
            input.length > 1000 ? "text-red-500" : "text-slate-400"
          )}>
            {input.length}/2000
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mt-3 py-2"
          >
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [-2, 2, -2],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                />
              ))}
            </div>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              AI is thinking...
            </span>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
