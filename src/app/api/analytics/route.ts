import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type') || 'user';

    if (type === 'user') {
      // Get user-specific analytics
      const userAnalytics = await analytics.getUserAnalytics(user.id, days);
      const rateLimit = await analytics.getUserRateLimit(user.id);

      return NextResponse.json({
        analytics: userAnalytics,
        rateLimit,
        period: `${days} days`,
      });
    } else if (type === 'system') {
      // System analytics removed - admin functionality not available
      return NextResponse.json({ error: 'System analytics not available' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, eventData, sessionId } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    await analytics.trackEvent({
      userId: user.id,
      sessionId,
      eventType,
      eventData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}