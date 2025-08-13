"use server";

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
  const question = lastMessage.content;

  try {
    const [inquiryResult, suggestionResult] = await Promise.all([
      procedureInquiry({ question }),
      suggestResource({ question, knowledgeBase: KNOWLEDGE_BASE }),
    ]);
    
    // Ensure resource suggestions are not null/undefined and filter out any empty items
    const validSuggestions = suggestionResult.resourceSuggestions?.filter(
      (r) => r && r.title && r.link && r.summary
    ) || [];

    return {
      answer: inquiryResult.answer,
      resources: validSuggestions.length > 0 ? validSuggestions : undefined,
    };
  } catch (error) {
    console.error('Error getting AI response:', error);
    return {
      answer: 'Sorry, I encountered an error while processing your request. Please try again.',
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
