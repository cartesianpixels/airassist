
"use client";

import * as React from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dadJokes } from "@/lib/dad-jokes";

interface ChatFormProps {
  onSubmit: (value: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatForm({ onSubmit, isLoading }: ChatFormProps) {
  const [input, setInput] = React.useState("");
  const [currentJoke, setCurrentJoke] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    let jokeInterval: NodeJS.Timeout;
    if (isLoading) {
      setCurrentJoke(dadJokes[Math.floor(Math.random() * dadJokes.length)]);
      jokeInterval = setInterval(() => {
        setCurrentJoke(dadJokes[Math.floor(Math.random() * dadJokes.length)]);
      }, 5000); // Change joke every 5 seconds
    } else {
      setCurrentJoke("");
    }
    return () => clearInterval(jokeInterval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      (e.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <form onSubmit={handleSubmit} className="flex w-full items-start gap-4">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about procedures..."
          className="flex-1 resize-none bg-secondary/50"
          rows={1}
          disabled={isLoading}
          aria-label="Chat input"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="h-10 w-10 shrink-0"
        >
          {isLoading ? (
            <svg
              className="h-5 w-5 animate-radar-sweep"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
            >
              <defs>
                <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 0.5 }} />
                  <stop offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
              <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
              <path d="M12 2 A 10 10 0 0 1 22 12" fill="url(#radar-gradient)" strokeLinecap="round" />
            </svg>
          ) : (
            <SendHorizonal className="h-5 w-5" />
          )}
        </Button>
      </form>
       {isLoading && currentJoke && (
        <div className="text-center text-xs text-muted-foreground animate-pulse mt-2">
          <p>Just for you while you wait: {currentJoke}</p>
        </div>
      )}
    </div>
  );
}
