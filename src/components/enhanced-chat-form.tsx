"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Square, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface EnhancedChatFormProps {
  onSubmit: (input: string) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedChatForm({ 
  onSubmit, 
  isLoading = false, 
  isStreaming = false,
  onStop,
  placeholder = "Ask about ATC procedures, regulations, or flight operations...",
  className 
}: EnhancedChatFormProps) {
  const [input, setInput] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput && !isLoading && !isStreaming) {
      onSubmit(trimmedInput);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'inherit';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const canSubmit = input.trim().length > 0 && !isLoading && !isStreaming;
  const showStop = isStreaming && onStop;

  // Quick suggestion prompts
  const quickPrompts = [
    "What are the separation requirements for IFR traffic?",
    "Explain the runway incursion procedures",
    "How do I handle an aircraft emergency?",
    "What are the weather minimums for approach?"
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Prompts */}
      {input.length === 0 && !isLoading && !isStreaming && (
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-xs px-3 py-1"
              onClick={() => {
                setInput(prompt);
                // Auto-submit the quick prompt
                setTimeout(() => {
                  if (!isLoading && !isStreaming) {
                    onSubmit(prompt);
                  }
                }, 100);
              }}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={cn(
          "relative rounded-2xl border-2 transition-all duration-200",
          isFocused 
            ? "border-blue-400 shadow-lg shadow-blue-100/50" 
            : "border-gray-200 hover:border-gray-300"
        )}>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 pr-24 text-base bg-transparent"
            disabled={isLoading}
          />
          
          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            {showStop ? (
              <Button
                type="button"
                size="sm"
                onClick={handleStop}
                className="h-9 px-3 bg-red-500 hover:bg-red-600 text-white shadow-sm"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-gray-100"
                  disabled={isLoading || isStreaming}
                >
                  <Mic className="w-4 h-4 text-gray-500" />
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSubmit}
                  className={cn(
                    "h-9 px-4 shadow-sm transition-all duration-200",
                    canSubmit 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isLoading || isStreaming ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span className="ml-1 text-xs">Processing...</span>
                    </>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Helper Text */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to send, 
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 ml-1">Shift+Enter</kbd> for new line
          </span>
          <span className={cn(
            "transition-colors",
            input.length > 1000 ? "text-red-500" : "text-gray-400"
          )}>
            {input.length}/2000
          </span>
        </div>
      </form>

      {/* Status Indicator */}
      {(isLoading || isStreaming) && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-blue-600 font-medium">
            {isStreaming ? "AI is responding..." : "Processing your question..."}
          </span>
        </div>
      )}
    </div>
  );
}