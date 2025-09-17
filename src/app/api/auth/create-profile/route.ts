import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, avatarUrl } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Use server-side Supabase client with service role permissions
    const supabase = await createServerSupabaseClient();

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    // Create new profile
    const defaultProfile = {
      id: userId,
      email: email,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      tier: 'free',
      role: 'user',
      is_active: true,
      onboarding_completed: false,
      total_tokens_used: 0,
      total_cost: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (error) {
      console.error('Server-side profile creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: newProfile });

  } catch (error) {
    console.error('Profile creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}