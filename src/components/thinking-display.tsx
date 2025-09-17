import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, BookOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThinkingDisplayProps {
  message: string;
  className?: string;
}

export function ThinkingDisplay({ message, className }: ThinkingDisplayProps) {
  if (!message) return null;

  // Determine icon based on message content
  const getIcon = (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('search') || lowerMessage.includes('finding')) {
      return Search;
    }
    if (lowerMessage.includes('knowledge') || lowerMessage.includes('base')) {
      return BookOpen;
    }
    if (lowerMessage.includes('analyzing') || lowerMessage.includes('thinking')) {
      return Brain;
    }
    return Lightbulb;
  };

  const Icon = getIcon(message);

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              <Icon className="w-3 h-3 mr-1 animate-pulse" />
              Thinking
            </Badge>
          </div>
          <p className="text-sm text-blue-700 font-medium animate-pulse">
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  className?: string;
}

export function StreamingMessage({ content, isComplete, className }: StreamingMessageProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800", className)}>
      <div className="relative">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content || ' '}
        </ReactMarkdown>
        {!isComplete && (
          <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

interface ThinkingStepsProps {
  steps: string[];
  currentStep?: number;
  className?: string;
}

export function ThinkingSteps({ steps, currentStep = 0, className }: ThinkingStepsProps) {
  if (steps.length === 0) return null;

  return (
    <Card className={cn("border-amber-200 bg-amber-50/50", className)}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-amber-600" />
            <h4 className="font-medium text-amber-800">Processing</h4>
          </div>
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 text-sm transition-opacity duration-200",
                index < currentStep ? "text-green-600" : 
                index === currentStep ? "text-amber-700 font-medium" : 
                "text-gray-400"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index < currentStep ? "bg-green-500" : 
                index === currentStep ? "bg-amber-500 animate-pulse" : 
                "bg-gray-300"
              )} />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}