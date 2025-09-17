import { useState, useCallback } from 'react';
import type { Message } from '@/lib/types';

export interface StreamingState {
  isStreaming: boolean;
  currentContent: string;
  error: string | null;
}

export interface UseStreamingChatOptions {
  onChunk?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentContent: '',
    error: null,
  });

  const sendMessage = useCallback(async (messages: Omit<Message, 'id' | 'resources'>[]) => {
    console.log('Starting message send...');
    setStreamingState({
      isStreaming: true,
      currentContent: '',
      error: null,
    });

    let abortController: AbortController | null = null;

    try {
      abortController = new AbortController();
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let messageCount = 0;
      const maxMessages = 1000; // Prevent infinite loops

      try {
        while (true) {
          if (messageCount++ > maxMessages) {
            console.warn('Max message limit reached, stopping stream');
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed naturally');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                switch (data.type) {
                  case 'chunk':
                    // Handle chunk content from AI assistant
                    const chunkData = data.data;
                    let chunkText = '';

                    // Handle different chunk formats
                    if (typeof chunkData === 'string') {
                      chunkText = chunkData;
                    } else if (chunkData?.content) {
                      if (Array.isArray(chunkData.content)) {
                        chunkText = chunkData.content[0]?.text || '';
                      } else if (typeof chunkData.content === 'string') {
                        chunkText = chunkData.content;
                      }
                    }

                    if (chunkText) {
                      setStreamingState(prev => ({
                        ...prev,
                        currentContent: prev.currentContent + chunkText
                      }));
                      options.onChunk?.(chunkText);
                    }
                    break;

                  case 'done':
                    console.log('Received done signal');
                    const finalContent = data.data?.content || streamingState.currentContent;
                    setStreamingState(prev => ({
                      ...prev,
                      isStreaming: false,
                      currentContent: finalContent
                    }));
                    options.onComplete?.(finalContent);
                    return finalContent;

                  case 'error':
                    console.error('Received error from stream:', data.data);
                    const errorMessage = data.data?.message || 'Unknown error occurred';
                    setStreamingState(prev => ({
                      ...prev,
                      isStreaming: false,
                      error: errorMessage
                    }));
                    options.onError?.(errorMessage);
                    throw new Error(errorMessage);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Line:', line);
                // Don't throw here, just log and continue
              }
            }
          }
        }
        
        // If we reach here without getting a 'done' signal, complete the stream
        console.log('Stream ended without done signal, completing...');
        setStreamingState(prev => ({
          ...prev,
          isStreaming: false
        }));
        options.onComplete?.(streamingState.currentContent);
        
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
          console.warn('Error releasing reader lock:', e);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage
      }));
      options.onError?.(errorMessage);
      
      if (abortController) {
        abortController.abort();
      }
      
      throw error;
    }
  }, [options, streamingState.currentContent]);

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