"use client";

import * as React from "react";
import { SendHorizonal, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatFormProps {
  onSubmit: (value: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatForm({ onSubmit, isLoading }: ChatFormProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

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
    <form onSubmit={handleSubmit} className="flex items-start gap-4">
      <Textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about procedures..."
        className="flex-1 resize-none"
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
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <SendHorizonal className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}
