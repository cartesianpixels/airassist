import { useState, useCallback, useRef } from 'react';

// Cache naming results to avoid duplicate API calls
const namingCache = new Map<string, { title: string; timestamp: number }>();
const NAMING_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface ChatNamingResult {
  success: boolean;
  title?: string;
  reason?: 'already_named' | 'auto_generated';
  error?: string;
}

interface UseChatNamingReturn {
  isNaming: boolean;
  autoNameChat: (sessionId: string, messages: any[]) => Promise<ChatNamingResult>;
  manualRenameChat: (sessionId: string, title: string) => Promise<ChatNamingResult>;
}

export function useChatNaming(): UseChatNamingReturn {
  const [isNaming, setIsNaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const autoNameChat = useCallback(async (
    sessionId: string,
    messages: any[]
  ): Promise<ChatNamingResult> => {
    if (messages.length < 2) {
      return { success: false, error: 'Need at least 2 messages to generate name' };
    }

    // Generate cache key based on first few messages
    const cacheKey = `${sessionId}_${messages.slice(0, 3).map(m => m.content.substring(0, 50)).join('_')}`;
    const cached = namingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NAMING_CACHE_DURATION) {
      return { success: true, title: cached.title, reason: 'cached' };
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsNaming(true);

    try {
      const response = await fetch('/api/chat/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages }),
        signal: abortControllerRef.current.signal
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate chat name');
      }

      // Cache the successful result
      if (result.success && result.title) {
        namingCache.set(cacheKey, { title: result.title, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      // Don't log aborted requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request cancelled' };
      }

      console.error('Error auto-naming chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsNaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const manualRenameChat = useCallback(async (
    sessionId: string,
    title: string
  ): Promise<ChatNamingResult> => {
    if (!title.trim()) {
      return { success: false, error: 'Title cannot be empty' };
    }

    setIsNaming(true);
    try {
      const response = await fetch('/api/chat/name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: title.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to rename chat');
      }

      return result;
    } catch (error) {
      console.error('Error renaming chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsNaming(false);
    }
  }, []);

  return {
    isNaming,
    autoNameChat,
    manualRenameChat,
  };
}

// Helper function to determine if a chat should be auto-named
export function shouldAutoNameChat(messages: any[], currentTitle?: string): boolean {
  // Don't rename if already has a custom title
  if (currentTitle &&
      !currentTitle.includes('New Chat') &&
      !currentTitle.includes('Untitled') &&
      currentTitle !== 'Chat Session') {
    return false;
  }

  // Auto-name after 2-3 messages (1 user + 1 assistant + 1 user)
  return messages.length >= 3;
}

// Helper function to get immediate title for generic prompts
export function getGenericPromptTitle(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase();

  // Aviation-specific quick titles
  const quickTitles: Record<string, string> = {
    'atc': 'ATC Procedures',
    'air traffic control': 'ATC Procedures',
    'tower': 'Tower Operations',
    'approach': 'Approach Procedures',
    'departure': 'Departure Procedures',
    'ifr': 'IFR Procedures',
    'vfr': 'VFR Procedures',
    'weather': 'Weather Information',
    'radio': 'Radio Communications',
    'emergency': 'Emergency Procedures',
    'landing': 'Landing Procedures',
    'takeoff': 'Takeoff Procedures',
    'pilot': 'Pilot Information',
    'flight plan': 'Flight Planning',
    'navigation': 'Navigation Help',
    'airspace': 'Airspace Information',
    'frequencies': 'Radio Frequencies',
    'clearance': 'Clearance Procedures',
    'runway': 'Runway Operations',
    'taxi': 'Taxi Instructions',
  };

  // Check for exact matches first
  for (const [keyword, title] of Object.entries(quickTitles)) {
    if (lowerPrompt.includes(keyword)) {
      return title;
    }
  }

  // Check for question patterns
  if (lowerPrompt.startsWith('what is') || lowerPrompt.startsWith('what are')) {
    if (lowerPrompt.includes('requirement')) return 'Requirements Info';
    if (lowerPrompt.includes('procedure')) return 'Procedure Help';
    if (lowerPrompt.includes('difference')) return 'Comparison Help';
  }

  if (lowerPrompt.startsWith('how to') || lowerPrompt.startsWith('how do')) {
    return 'How-To Guide';
  }

  if (lowerPrompt.startsWith('explain')) {
    return 'Explanation Request';
  }

  // No immediate title found
  return null;
}