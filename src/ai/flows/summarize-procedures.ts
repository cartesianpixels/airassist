'use server';

/**
 * @fileOverview An AI agent that summarizes FAA and IVAO procedures.
 *
 * - summarizeProcedures - A function that summarizes the provided procedures.
 * - SummarizeProceduresInput - The input type for the summarizeProcedures function.
 * - SummarizeProceduresOutput - The return type for the summarizeProcedures function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProceduresInputSchema = z.object({
  procedures: z
    .string()
    .describe('The FAA and IVAO procedures to summarize.'),
});
export type SummarizeProceduresInput = z.infer<typeof SummarizeProceduresInputSchema>;

const SummarizeProceduresOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the procedures.'),
});
export type SummarizeProceduresOutput = z.infer<typeof SummarizeProceduresOutputSchema>;

export async function summarizeProcedures(input: SummarizeProceduresInput): Promise<SummarizeProceduresOutput> {
  return summarizeProceduresFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProceduresPrompt',
  input: {schema: SummarizeProceduresInputSchema},
  output: {schema: SummarizeProceduresOutputSchema},
  prompt: `You are an expert air traffic controller knowledgeable in FAA and IVAO procedures.
  Your task is to provide a concise and accurate summary of the procedures provided.

  Procedures:
  {{procedures}}
  `,
});

const summarizeProceduresFlow = ai.defineFlow(
  {
    name: 'summarizeProceduresFlow',
    inputSchema: SummarizeProceduresInputSchema,
    outputSchema: SummarizeProceduresOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
