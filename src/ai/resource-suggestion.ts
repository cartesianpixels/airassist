'use server';
/**
 * @fileOverview Suggests relevant resources from the knowledge base based on user questions.
 *
 * - suggestResource - A function that suggests resources from the knowledge base.
 * - SuggestResourceInput - The input type for the suggestResource function.
 * - SuggestResourceOutput - The return type for the suggestResource function.
 */

import { openai } from '@/lib/openai';
import { z } from 'zod';

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
  const prompt = `You are an AI assistant for air traffic controllers. Your task is to suggest relevant resources from the provided knowledge base based on the air traffic controller's question.

Question: ${input.question}

Knowledge Base:
${JSON.stringify(input.knowledgeBase, null, 2)}

Based on the question and the knowledge base, suggest relevant resources. Provide the title, an anchor link to the relevant section (for example FAA 7110.65 Chapter 4, Section 2), and a brief summary for each suggested resource.
Return an empty list if no relevant resources are found.

Respond with a JSON object matching this schema:
{
  "resourceSuggestions": [
    {
      "title": "string",
      "link": "string",
      "summary": "string"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI assistant that helps air traffic controllers find relevant resources. Always respond with valid JSON matching the requested schema.',
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
      return { resourceSuggestions: [] };
    }

    const parsed = JSON.parse(responseText);
    const validated = SuggestResourceOutputSchema.parse(parsed);

    // Filter out any suggestions that are missing required fields
    const filteredSuggestions = validated.resourceSuggestions.filter(
      (suggestion) => suggestion.title && suggestion.link && suggestion.summary
    );

    return { resourceSuggestions: filteredSuggestions };
  } catch (error) {
    console.error('Error in suggestResource:', error);
    return { resourceSuggestions: [] };
  }
}