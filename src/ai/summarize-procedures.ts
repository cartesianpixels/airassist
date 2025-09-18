'use server';

/**
 * @fileOverview An AI agent that summarizes FAA and IVAO procedures.
 *
 * - summarizeProcedures - A function that summarizes the provided procedures.
 * - SummarizeProceduresInput - The input type for the summarizeProcedures function.
 * - SummarizeProceduresOutput - The return type for the summarizeProcedures function.
 */

import { openai } from '@/lib/openai';
import { z } from 'zod';

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
  const prompt = `You are an expert air traffic controller knowledgeable in FAA and IVAO procedures.
Your task is to provide a concise and accurate summary of the procedures provided.

Procedures:
${input.procedures}

Respond with a JSON object matching this schema:
{
  "summary": "string"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert air traffic controller. Provide concise, accurate summaries of ATC procedures. Always respond with valid JSON matching the requested schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return { summary: 'Unable to generate summary.' };
    }

    const parsed = JSON.parse(responseText);
    const validated = SummarizeProceduresOutputSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('Error in summarizeProcedures:', error);
    return { summary: 'Error occurred while generating summary.' };
  }
}