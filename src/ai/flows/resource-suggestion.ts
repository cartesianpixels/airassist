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
  knowledgeBase: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      metadata: z.object({
        title: z.string(),
        type: z.string(),
        procedure_type: z.string(),
        chapter: z.string().optional(),
        section: z.string().optional(),
        paragraph: z.string().optional(),
        source: z.string(),
        chunk_index: z.number().optional(),
        total_chunks: z.number().optional(),
      }),
      displayName: z.string(),
      tags: z.array(z.string()),
      summary: z.string(),
    })
  ).describe('The local knowledge base containing FAA and IVAO procedures in JSON format.'),
});
export type SuggestResourceInput = z.infer<typeof SuggestResourceInputSchema>;

const SuggestResourceOutputSchema = z.object({
  resourceSuggestions: z.array(
    z.object({
      title: z.string().describe('The title of the resource.'),
      link: z.string().describe('A link to the resource. Use the document source and section if available.'),
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
{{{json knowledgeBase}}}

Based on the question and the knowledge base, suggest relevant resources. Provide the title, an anchor link to the relevant section (for example FAA 7110.65 Chapter 4, Section 2), and a brief summary for each suggested resource.
Return an empty list if no relevant resources are found.
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
    if (!output) {
      return { resourceSuggestions: [] };
    }
    // Filter out any suggestions that are missing required fields.
    const filteredSuggestions = output.resourceSuggestions.filter(
      (suggestion) => suggestion.title && suggestion.link && suggestion.summary
    );
    return { resourceSuggestions: filteredSuggestions };
  }
);
