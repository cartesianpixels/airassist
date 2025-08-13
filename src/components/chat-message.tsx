"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, ThumbsUp, ThumbsDown, Link as LinkIcon, Clipboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback } from "@/app/actions";
import type { Message } from "@/lib/types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { toast } = useToast();
  const isAssistant = message.role === "assistant";

  const handleFeedback = async (type: "positive" | "negative") => {
    const { message } = await submitFeedback(type);
    toast({
      title: "Feedback Submitted",
      description: message,
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
    <div className={`flex items-start gap-4 ${isAssistant ? "" : "justify-end"}`}>
      {isAssistant && (
        <Avatar className="h-9 w-9 border border-border">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isAssistant ? "" : "items-end"}`}>
        <div className={`rounded-lg p-4 ${isAssistant ? "bg-card" : "bg-primary text-primary-foreground"}`}>
          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {isAssistant && message.resources && message.resources.length > 0 && (
          <div className="w-full">
            <h3 className="text-sm font-semibold mb-2">Suggested Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {message.resources.map((resource, index) => (
                <Card key={index} className="bg-background/80">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      <a href={resource.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {resource.title}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
                    {resource.summary}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {isAssistant && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              <Clipboard className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback("positive")}>
              <ThumbsUp className="w-4 h-4 text-green-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback("negative")}>
              <ThumbsDown className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        )}
      </div>
      {!isAssistant && (
        <Avatar className="h-9 w-9 border border-border">
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
