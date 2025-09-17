import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { conversationText } = await request.json();

    if (!conversationText) {
      return NextResponse.json(
        { error: 'Conversation text required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      title: generatedTitle
    });

  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}