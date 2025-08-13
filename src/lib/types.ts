import type { SuggestResourceOutput } from "@/ai/flows/resource-suggestion";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  resources?: SuggestResourceOutput["resourceSuggestions"];
};
