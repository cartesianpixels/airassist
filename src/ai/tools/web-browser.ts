'use server';
/**
 * @fileOverview A web browsing tool for the AI assistant.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import fetch from 'node-fetch';
import {JSDOM} from 'jsdom';

export const browse = ai.defineTool(
  {
    name: 'browse',
    description:
      'Fetches the content of a web page from a given URL. Use this to research topics when you cannot find the answer in the provided knowledge base. This tool is especially useful for accessing real-time information or specific documents from approved websites.',
    inputSchema: z.object({
      url: z.string().describe('The URL to fetch content from.'),
    }),
    outputSchema: z.string().describe('The text content of the web page.'),
  },
  async ({url}) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return `Error: Failed to fetch URL. Status code: ${response.status}`;
      }
      const html = await response.text();
      const dom = new JSDOM(html);
      // Remove script, style, and other non-visible elements
      dom.window.document
        .querySelectorAll('script, style, head, nav, footer, header')
        .forEach(el => el.remove());

      // Extract text from the body, replacing block elements with newlines
      let textContent = '';
      dom.window.document.body
        .querySelectorAll('*')
        .forEach(el => {
          if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(el.tagName)) {
            textContent += el.textContent + '\n';
          }
        });
      
      // Clean up extra whitespace
      return textContent.replace(/\s{2,}/g, ' ').trim();
    } catch (error) {
      console.error('Web browsing tool error:', error);
      return `Error: Could not fetch or process the URL. ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }
);
