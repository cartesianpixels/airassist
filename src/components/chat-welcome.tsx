import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AirAssistLogo } from "./icons";
import { MessageSquare } from "lucide-react";

const examplePrompts = [
  "What are the standard separation minima for aircraft on final approach?",
  "Explain VFR-on-top procedures.",
  "Summarize the IVAO rules for altimeter settings.",
  "What is the maximum speed below 10,000 feet?",
];

export function ChatWelcome() {
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
          <h2 className="text-lg font-medium text-foreground mb-4">Example Prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examplePrompts.map((prompt, index) => (
              <Card key={index} className="text-left bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
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
