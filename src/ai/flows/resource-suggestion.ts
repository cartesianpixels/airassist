'use server';
/**
 * @fileOverview Suggests relevant resources from the knowledge base based on user questions.
 *
 * - suggestResource - A function that suggests resources from the knowledge base.
 * - SuggestResourceInput - The input type for the suggestResource function.
 * - SuggestResourceOutput - The return type for the suggestResource function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestResourceInputSchema = z.object({
  question: z.string().describe('The question asked by the air traffic controller.'),
  knowledgeBase: z.string().describe('The local knowledge base containing FAA and IVAO procedures.'),
});
export type SuggestResourceInput = z.infer<typeof SuggestResourceInputSchema>;

const SuggestResourceOutputSchema = z.object({
  resourceSuggestions: z.array(
    z.object({
      title: z.string().describe('The title of the resource.'),
      link: z.string().describe('The link to the resource.'),
      summary: z.string().describe('A brief summary of the resource.'),
    })
  ).describe('A list of suggested resources from the knowledge base.'),
});
export type SuggestResourceOutput = z.infer<typeof SuggestResourceOutputSchema>;

export async function suggestResource(input: SuggestResourceInput): Promise<SuggestResourceOutput> {
  return suggestResourceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestResourcePrompt',
  input: {schema: SuggestResourceInputSchema},
  output: {schema: SuggestResourceOutputSchema},
  prompt: `You are an AI assistant for air traffic controllers. Your task is to suggest relevant resources from the provided knowledge base based on the air traffic controller's question.

Question: {{{question}}}

Knowledge Base:
{{{knowledgeBase}}}

Based on the question and the knowledge base, suggest relevant resources. Provide the title, link, and a brief summary for each suggested resource.

Format your response as a JSON array of resource suggestions. Each resource suggestion should include the title, link, and summary.
`,
});

const suggestResourceFlow = ai.defineFlow(
  {
    name: 'suggestResourceFlow',
    inputSchema: SuggestResourceInputSchema,
    outputSchema: SuggestResourceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
