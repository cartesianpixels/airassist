"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

// Streaming text component with typewriter effect
const StreamingText: React.FC<{ content: string; isComplete: boolean }> = ({
  content,
  isComplete,
}) => {
  const [displayedContent, setDisplayedContent] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 20); // Adjust speed as needed
      return () => clearTimeout(timer);
    }
  }, [content, currentIndex]);

  React.useEffect(() => {
    if (content.length < displayedContent.length || content !== displayedContent.slice(0, content.length)) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, displayedContent]);

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {displayedContent}
      </ReactMarkdown>
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline-block w-2 h-5 bg-emerald-500 ml-1"
        />
      )}
    </div>
  );
};

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const { toast } = useToast();
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        description: "Message copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        description: "Failed to copy message",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    toast({
      description: `Thank you for your ${type} feedback!`,
      duration: 2000,
    });
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end mb-6"
      >
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <Avatar className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700">
            <AvatarFallback className="bg-slate-100 dark:bg-slate-800">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start mb-6"
    >
      <div className="flex items-start gap-3 max-w-4xl">
        <Avatar className="w-8 h-8 border-2 border-emerald-200 dark:border-emerald-800">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500">
            <Sparkles className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl rounded-tl-md border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden">
            <div className="px-4 py-3">
              {isStreaming ? (
                <StreamingText content={message.content} isComplete={false} />
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isStreaming && message.content && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-1 px-4 py-2 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback("positive")}
                  className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Good
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback("negative")}
                  className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  Bad
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}