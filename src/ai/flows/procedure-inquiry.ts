'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures.
 *
 * - procedureInquiry - A function that takes a question about procedures and returns an answer.
 * - ProcedureInquiryInput - The input type for the procedureInquiry function.
 * - ProcedureInquiryOutput - The return type for the procedureInquiry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcedureInquiryInputSchema = z.object({
  question: z.string().describe('The question about FAA or IVAO procedures.'),
});
export type ProcedureInquiryInput = z.infer<typeof ProcedureInquiryInputSchema>;

const ProcedureInquiryOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about FAA or IVAO procedures.'),
});
export type ProcedureInquiryOutput = z.infer<typeof ProcedureInquiryOutputSchema>;

export async function procedureInquiry(input: ProcedureInquiryInput): Promise<ProcedureInquiryOutput> {
  return procedureInquiryFlow(input);
}

const procedureInquiryPrompt = ai.definePrompt({
  name: 'procedureInquiryPrompt',
  input: {schema: ProcedureInquiryInputSchema},
  output: {schema: ProcedureInquiryOutputSchema},
  prompt: `You are an expert air traffic controller with extensive knowledge of FAA and IVAO procedures. Answer the following question to the best of your ability, using your knowledge of these procedures.\n\nQuestion: {{{question}}}`,
});

const procedureInquiryFlow = ai.defineFlow(
  {
    name: 'procedureInquiryFlow',
    inputSchema: ProcedureInquiryInputSchema,
    outputSchema: ProcedureInquiryOutputSchema,
  },
  async input => {
    const {output} = await procedureInquiryPrompt(input);
    return output!;
  }
);
