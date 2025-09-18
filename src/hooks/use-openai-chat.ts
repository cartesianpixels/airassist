import { useState, useCallback } from 'react';
import type { Message } from '@/lib/supabase-typed';

export interface StreamingState {
  isStreaming: boolean;
  currentContent: string;
  error: string | null;
}

export interface UseOpenAIChatOptions {
  onChunk?: (content: string) => void;
  onComplete?: (content: string, messageId?: string) => void;
  onError?: (error: string) => void;
}

export function useOpenAIChat(options: UseOpenAIChatOptions = {}) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentContent: '',
    error: null,
  });

  const sendMessage = useCallback(async (messages: Omit<Message, 'id' | 'resources'>[], messageId?: string, sessionId?: string) => {
    console.log('Starting OpenAI message send...');
    setStreamingState({
      isStreaming: true,
      currentContent: '',
      error: null,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('Stream done, final content length:', content.length);
              setStreamingState(prev => ({
                ...prev,
                isStreaming: false
              }));
              options.onComplete?.(content, messageId);
              return content;
            }

            try {
              const parsed = JSON.parse(data);
              const deltaContent = parsed.choices?.[0]?.delta?.content || '';
              if (deltaContent) {
                content += deltaContent;
                setStreamingState(prev => ({
                  ...prev,
                  currentContent: content
                }));
                options.onChunk?.(deltaContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setStreamingState(prev => ({
        ...prev,
        isStreaming: false
      }));
      options.onComplete?.(content, messageId);
      return content;

    } catch (error) {
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage
      }));
      options.onError?.(errorMessage);
      throw error;
    }
  }, [options.onChunk, options.onComplete, options.onError]);

  const reset = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      currentContent: '',
      error: null,
    });
  }, []);

  return {
    streamingState,
    sendMessage,
    reset,
  };
}