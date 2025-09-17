import { createClient } from '@/lib/supabase';
import type { ChatSessionUpdate, AnalyticsEventInsert } from '@/lib/supabase-typed';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface NamingResult {
  success: boolean;
  title?: string;
  reason?: 'already_named' | 'auto_generated' | 'cached' | 'error';
  error?: string;
}

export async function generateChatTitle(sessionId: string, messages: ChatMessage[]): Promise<NamingResult> {
  if (!sessionId || !messages || messages.length < 2) {
    return {
      success: false,
      error: 'Session ID and at least 2 messages required',
      reason: 'error'
    };
  }

  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
        reason: 'error'
      };
    }

    // Verify user owns this session
    const { data: sessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, user_id, title')
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (sessionError || !sessions || sessions.length === 0) {
      return {
        success: false,
        error: 'Session not found',
        reason: 'error'
      };
    }

    const session = sessions[0];

    // Skip if already has a custom title (not "New Chat Session")
    if (session.title && !session.title.includes('New Chat') && !session.title.includes('Untitled')) {
      return {
        success: true,
        title: session.title,
        reason: 'already_named'
      };
    }

    // Prepare conversation context for AI analysis
    const conversationText = messages
      .slice(0, 6) // Analyze first few messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Generate title using OpenAI (client-side call)
    const response = await fetch('/api/openai/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationText
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to generate title',
        reason: 'error'
      };
    }

    const { title: generatedTitle } = await response.json();

    if (!generatedTitle) {
      return {
        success: false,
        error: 'No title generated',
        reason: 'error'
      };
    }

    // Update session title in database
    const updateData: ChatSessionUpdate = {
      title: generatedTitle,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return {
        success: false,
        error: 'Failed to update session title',
        reason: 'error'
      };
    }

    // Track analytics event
    try {
      const analyticsData: AnalyticsEventInsert = {
        user_id: user.id,
        session_id: sessionId,
        event_type: 'session_auto_named',
        event_data: {
          old_title: session.title,
          new_title: generatedTitle,
          message_count: messages.length,
          generated_by: 'ai'
        }
      };

      await supabase
        .from('analytics_events')
        .insert(analyticsData);
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return {
      success: true,
      title: generatedTitle,
      reason: 'auto_generated'
    };

  } catch (error) {
    console.error('Error in chat naming:', error);
    return {
      success: false,
      error: 'Internal error',
      reason: 'error'
    };
  }
}

export async function renameChat(sessionId: string, title: string): Promise<NamingResult> {
  if (!sessionId || !title || title.trim().length === 0) {
    return {
      success: false,
      error: 'Session ID and title required',
      reason: 'error'
    };
  }

  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
        reason: 'error'
      };
    }

    // Update session title
    const updateData: ChatSessionUpdate = {
      title: title.trim(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return {
        success: false,
        error: 'Failed to update session title',
        reason: 'error'
      };
    }

    // Track analytics event
    try {
      const analyticsData: AnalyticsEventInsert = {
        user_id: user.id,
        session_id: sessionId,
        event_type: 'session_manually_renamed',
        event_data: {
          new_title: title.trim(),
          renamed_by: 'user'
        }
      };

      await supabase
        .from('analytics_events')
        .insert(analyticsData);
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return {
      success: true,
      title: title.trim()
    };

  } catch (error) {
    console.error('Error in manual chat renaming:', error);
    return {
      success: false,
      error: 'Internal error',
      reason: 'error'
    };
  }
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