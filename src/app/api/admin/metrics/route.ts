import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get system metrics
    const [
      usersResult,
      sessionsResult,
      messagesResult,
      apiUsageResult,
      analyticsEventsResult,
    ] = await Promise.all([
      // Total and active users
      supabase
        .from('profiles')
        .select('id, created_at, last_login, tier', { count: 'exact' })
        .eq('is_active', true),

      // Sessions data
      supabase
        .from('chat_sessions')
        .select('id, created_at, total_tokens, total_cost, session_duration_minutes')
        .gte('created_at', startDate.toISOString()),

      // Messages data
      supabase
        .from('messages')
        .select('id, created_at, total_tokens, cost, response_time_ms')
        .gte('created_at', startDate.toISOString()),

      // API usage data
      supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString()),

      // Analytics events
      supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString()),
    ]);

    const users = usersResult.data || [];
    const sessions = sessionsResult.data || [];
    const messages = messagesResult.data || [];
    const apiUsage = apiUsageResult.data || [];
    const events = analyticsEventsResult.data || [];

    // Calculate metrics
    const now = new Date();
    const activeUsers = users.filter(user => {
      if (!user.last_login) return false;
      const lastLogin = new Date(user.last_login);
      const daysSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 7; // Active if logged in within 7 days
    });

    const totalTokensUsed = messages.reduce((sum, msg) => sum + (msg.total_tokens || 0), 0);
    const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
    const averageResponseTime = messages.length > 0
      ? messages.reduce((sum, msg) => sum + (msg.response_time_ms || 0), 0) / messages.length
      : 0;

    const errorCount = apiUsage.filter(log => log.error_message).length;
    const errorRate = apiUsage.length > 0 ? (errorCount / apiUsage.length) * 100 : 0;

    // User tier distribution
    const tierDistribution = users.reduce((acc: any, user: any) => {
      const tier = user.tier || 'free';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    // Model usage statistics
    const modelUsage = apiUsage.reduce((acc: any, log: any) => {
      const model = log.model_used || 'unknown';
      if (!acc[model]) {
        acc[model] = {
          model,
          usageCount: 0,
          totalTokens: 0,
          totalCost: 0,
        };
      }
      acc[model].usageCount += 1;
      acc[model].totalTokens += log.tokens_used || 0;
      acc[model].totalCost += log.cost || 0;
      return acc;
    }, {});

    // Daily metrics
    const dailyMetrics = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];

      const dayEvents = events.filter(event => 
        event.created_at.startsWith(dateStr)
      );

      const daySessions = sessions.filter(session => 
        session.created_at.startsWith(dateStr)
      );

      const dayMessages = messages.filter(message => 
        message.created_at.startsWith(dateStr)
      );

      const dayApiUsage = apiUsage.filter(log => 
        log.created_at.startsWith(dateStr)
      );

      return {
        date: dateStr,
        sessions: daySessions.length,
        messages: dayMessages.length,
        tokens: dayMessages.reduce((sum, msg) => sum + (msg.total_tokens || 0), 0),
        cost: dayMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0),
        apiCalls: dayApiUsage.length,
        errors: dayApiUsage.filter(log => log.error_message).length,
        uniqueUsers: new Set(dayApiUsage.map(log => log.user_id)).size,
      };
    });

    // Real-time metrics
    const realtimeMetrics = {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      totalSessions: sessions.length,
      totalMessages: messages.length,
      totalTokens: totalTokensUsed,
      totalCost,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      averageSessionLength: sessions.length > 0 
        ? Math.round(sessions.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) / sessions.length)
        : 0,
      averageMessagesPerSession: sessions.length > 0
        ? Math.round(messages.length / sessions.length)
        : 0,
    };

    return NextResponse.json({
      metrics: realtimeMetrics,
      dailyMetrics,
      tierDistribution,
      modelUsage: Object.values(modelUsage).sort((a: any, b: any) => b.usageCount - a.usageCount),
      period: `${days} days`,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Admin metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin metrics' },
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { metricName, metricValue, metricUnit, tags } = body;

    if (!metricName || metricValue === undefined) {
      return NextResponse.json({ error: 'Metric name and value are required' }, { status: 400 });
    }

    // Record the custom metric
    const { error } = await supabase
      .from('system_metrics')
      .insert({
        metric_name: metricName,
        metric_value: metricValue,
        metric_unit: metricUnit,
        tags: tags || {},
      });

    if (error) {
      console.error('Error recording metric:', error);
      return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin metrics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to record metric' },
      { status: 500 }
    );
  }
}