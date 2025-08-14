
"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AirAssistLogo } from "./icons";
import { Input } from "./ui/input";
import { Search } from "lucide-react";

const examplePrompts = [
  "What are the standard separation minima for aircraft on final approach?",
  "Explain VFR-on-top procedures.",
  "Summarize the IVAO rules for altimeter settings.",
  "What is the maximum speed below 10,000 feet?",
  "Describe the procedure for a go-around.",
  "What are the requirements for issuing a visual approach clearance?",
  "Explain the difference between QNH, QFE, and QNE.",
  "What are the lost communication procedures for an IFR flight?",
];

// Function to shuffle an array
const shuffleArray = (array: string[]) => {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};


interface ChatWelcomeProps {
  onPromptClick: (prompt: string) => void;
}

export function ChatWelcome({ onPromptClick }: ChatWelcomeProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [displayPrompts, setDisplayPrompts] = React.useState<string[]>(examplePrompts);
  
  React.useEffect(() => {
    setDisplayPrompts(shuffleArray([...examplePrompts]));
  }, []);

  const filteredPrompts = displayPrompts.filter((prompt) =>
    prompt.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 4);


  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="text-center p-8">
        <div className="flex justify-center mb-4">
          <AirAssistLogo />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Your AI Assistant for Aviation Procedures
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Ask me anything about FAA and IVAO procedures. I can provide answers, summarize documents, and suggest relevant resources.
        </p>

        <div className="mt-12 w-full max-w-2xl mx-auto">
           <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search example prompts..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrompts.map((prompt, index) => (
              <Card 
                key={index} 
                className="text-left bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                onClick={() => onPromptClick(prompt)}
              >
                <CardContent className="p-4">
                  <p className="text-sm text-foreground">{prompt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
