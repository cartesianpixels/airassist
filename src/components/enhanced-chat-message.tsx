"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, ThumbsUp, ThumbsDown, Link as LinkIcon, Clipboard, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// import { submitFeedback } from "@/app/actions"; // Removed - obsolete file
import type { Message } from "@/lib/types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingDisplay, StreamingMessage } from "./thinking-display";
import { cn } from "@/lib/utils";

interface EnhancedChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  className?: string;
}

export function EnhancedChatMessage({ 
  message, 
  isStreaming = false,
  className 
}: EnhancedChatMessageProps) {
  const { toast } = useToast();
  const isAssistant = message.role === "assistant";

  const handleFeedback = async (type: "positive" | "negative") => {
    // const { message: feedbackMessage } = await submitFeedback(type); // Disabled - actions removed
    const feedbackMessage = "Feedback submitted successfully"; // Placeholder
    toast({
      title: "Feedback Submitted",
      description: feedbackMessage,
      variant: type === 'positive' ? 'default' : 'destructive',
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied to Clipboard",
      description: "The assistant's response has been copied.",
    });
  };

  return (
    <div className={cn("flex items-start gap-4", !isAssistant && "justify-end", className)}>
      {isAssistant && (
        <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col gap-3 max-w-[85%] transition-all duration-200",
        !isAssistant && "items-end"
      )}>
        {/* Main Message */}
        <div className={cn(
          "rounded-2xl p-4 shadow-sm transition-all duration-200",
          isAssistant 
            ? "bg-white border border-gray-200 hover:shadow-md" 
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
        )}>
          {isStreaming && isAssistant ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  Generating
                </Badge>
              </div>
              <StreamingMessage 
                content={message.content} 
                isComplete={false}
              />
            </div>
          ) : isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap font-medium">{message.content}</p>
          )}
        </div>

        {/* Resources Section */}
        {isAssistant && message.resources && message.resources.length > 0 && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-700">Suggested Resources</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {message.resources.map((resource: any, index: number) => (
                <Card key={index} className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-blue-200/50 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <a 
                        href={resource.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline text-blue-700 hover:text-blue-800 transition-colors"
                      >
                        {resource.title}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-gray-600">
                    {resource.summary}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isAssistant && !isStreaming && (
          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 hover:bg-gray-100" 
              onClick={handleCopy}
            >
              <Clipboard className="w-3 h-3 mr-1" />
              Copy
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 hover:bg-green-50 hover:text-green-600" 
              onClick={() => handleFeedback("positive")}
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Helpful
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 hover:bg-red-50 hover:text-red-600" 
              onClick={() => handleFeedback("negative")}
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              Not helpful
            </Button>
          </div>
        )}
      </div>

      {!isAssistant && (
        <Avatar className="h-10 w-10 border-2 border-gray-200 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200">
            <User className="h-5 w-5 text-gray-600" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}