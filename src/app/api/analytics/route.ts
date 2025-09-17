import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { analytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
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
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Get system-wide analytics
      const systemAnalytics = await analytics.getSystemAnalytics(days);
      const modelStats = await analytics.getModelUsageStats(days);

      return NextResponse.json({
        analytics: systemAnalytics,
        modelStats,
        period: `${days} days`,
      });
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
    const supabase = await createClient();
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