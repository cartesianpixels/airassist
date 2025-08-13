"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { KNOWLEDGE_BASE } from "@/lib/mock-data";
import { Book, Search } from "lucide-react";

export function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-primary/20 text-primary-foreground rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div>
        <h2 className="text-sm font-semibold text-muted-foreground px-2 py-1">Knowledge Base</h2>
        <div className="relative p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search knowledge base..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {getHighlightedText(KNOWLEDGE_BASE, searchTerm)}
            </p>
        </div>
    </div>
  );
}
