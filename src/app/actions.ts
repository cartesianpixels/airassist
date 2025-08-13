"use server";

import { atcAssistantFlowWrapper } from "@/ai/assistant";
import { procedureInquiry } from '@/ai/flows/procedure-inquiry';
import { suggestResource } from '@/ai/flows/resource-suggestion';
import { KNOWLEDGE_BASE } from '@/lib/mock-data';
import type { Message } from '@/lib/types';

// A simple in-memory store for feedback. In a real app, use a database.
const feedbackStore = {
  positive: 0,
  negative: 0,
};

export async function getAiResponse(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<{ answer: string; resources: Message['resources'] }> {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== 'user') {
    throw new Error('Last message must be from the user.');
  }

  try {
    const answer = await atcAssistantFlowWrapper(messages);
    
    // For now, we are not getting resources, so we return an empty array.
    const resources = undefined;

    return {
      answer,
      resources,
    };
  } catch (error) {
    console.error('Error getting AI response:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      answer: `Sorry, I encountered an error while processing your request. Please try again. Error: ${errorMessage}`,
      resources: [],
    };
  }
}

export async function submitFeedback(type: 'positive' | 'negative') {
  if (type === 'positive') {
    feedbackStore.positive++;
  } else {
    feedbackStore.negative++;
  }
  console.log('Feedback submitted. Current stats:', feedbackStore);
  return { success: true, message: 'Thank you for your feedback!' };
}
