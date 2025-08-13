'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by searching a local CSV knowledge base.
 *
 * - atcAssistantFlow - A function that takes a question and returns an answer from the knowledge base.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'csv-parse/sync';

export async function atcAssistantFlow(question: string): Promise<string> {
  const atcAssistantFlow = ai.defineFlow(
    {
      name: 'atcAssistantFlow',
      inputSchema: z.string(),
      outputSchema: z.string(),
    },
    async (question) => {
      // This path navigates from the compiled code back to your data folder
      const csvFilePath = path.resolve(process.cwd(), 'src/data/knowledge.csv');
      const fileContent = fs.readFileSync(csvFilePath, {encoding: 'utf-8'});

      const records: {source: string; content: string}[] = parse(fileContent, {
        columns: true, // Use the first row as headers ('source', 'content')
        skip_empty_lines: true,
      });

      const lowerCaseQuestion = question.toLowerCase();
      // A simple search that finds a row where the content column includes the user's question.
      const foundRecord = records.find((record) =>
        record.content.toLowerCase().includes(lowerCaseQuestion)
      );

      if (foundRecord) {
        return `Source: ${foundRecord.source}\n\n${foundRecord.content}`;
      } else {
        return "I'm sorry, I could not find a procedure matching your question in the knowledge base.";
      }
    }
  );
  return atcAssistantFlow(question);
}
