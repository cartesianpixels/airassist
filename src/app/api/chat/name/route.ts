import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages } = await request.json();

    if (!sessionId || !messages || messages.length < 2) {
      return NextResponse.json(
        { error: 'Session ID and at least 2 messages required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('id, user_id, title')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Skip if already has a custom title (not "New Chat Session")
    if (session.title && !session.title.includes('New Chat') && !session.title.includes('Untitled')) {
      return NextResponse.json({
        success: true,
        title: session.title,
        reason: 'already_named'
      });
    }

    // Prepare conversation context for AI analysis
    const conversationText = messages
      .slice(0, 6) // Analyze first few messages
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Generate title using AI
    const titleResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a chat title generator for an aviation AI assistant app called AirAssist.

Your job is to analyze the beginning of a conversation and create a concise, descriptive title (3-6 words max) that captures the main topic or question.

Rules:
- Keep titles short and professional
- Focus on the main aviation topic discussed
- Use aviation terminology when appropriate
- Avoid generic words like "chat", "discussion", "question"
- Make it specific to what the user is asking about
- Examples of good titles:
  * "ATC Tower Procedures"
  * "IFR Flight Planning"
  * "Emergency Landing Protocol"
  * "Radio Communication Basics"
  * "Weather Minimums Help"
  * "Pilot Certification Requirements"

Respond with ONLY the title, no quotes, no extra text.`
        },
        {
          role: 'user',
          content: `Generate a title for this aviation conversation:\n\n${conversationText}`
        }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const generatedTitle = titleResponse.choices[0]?.message?.content?.trim();

    if (!generatedTitle) {
      return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
    }

    // Update session title in database
    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        title: generatedTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return NextResponse.json({ error: 'Failed to update session title' }, { status: 500 });
    }

    // Track analytics event
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          event_type: 'session_auto_named',
          event_data: {
            old_title: session.title,
            new_title: generatedTitle,
            message_count: messages.length,
            generated_by: 'ai'
          }
        });
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      title: generatedTitle,
      reason: 'auto_generated'
    });

  } catch (error) {
    console.error('Error in chat naming:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint to manually rename a chat
export async function PUT(request: NextRequest) {
  try {
    const { sessionId, title } = await request.json();

    if (!sessionId || !title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session ID and title required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update session title
    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return NextResponse.json({ error: 'Failed to update session title' }, { status: 500 });
    }

    // Track analytics event
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          event_type: 'session_manually_renamed',
          event_data: {
            new_title: title.trim(),
            renamed_by: 'user'
          }
        });
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      title: title.trim()
    });

  } catch (error) {
    console.error('Error in manual chat renaming:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}