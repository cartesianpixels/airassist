import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's API usage logs
    const { data: apiLogs, error: apiError } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (apiError) {
      console.error('Error fetching API usage logs:', apiError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Aggregate data by period
    const usageByPeriod = (apiLogs || []).reduce((acc: any, log: any) => {
      const date = new Date(log.created_at);
      let key: string;

      if (period === 'hourly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }

      if (!acc[key]) {
        acc[key] = {
          period: key,
          requests: 0,
          totalTokens: 0,
          totalCost: 0,
          averageResponseTime: 0,
          models: {},
          errors: 0,
        };
      }

      acc[key].requests += 1;
      acc[key].totalTokens += log.tokens_used || 0;
      acc[key].totalCost += log.cost || 0;
      acc[key].averageResponseTime += log.response_time_ms || 0;

      if (log.error_message) {
        acc[key].errors += 1;
      }

      const model = log.model_used || 'unknown';
      acc[key].models[model] = (acc[key].models[model] || 0) + 1;

      return acc;
    }, {});

    // Calculate averages and format data
    const usage = Object.values(usageByPeriod).map((item: any) => ({
      ...item,
      averageResponseTime: item.requests > 0 ? Math.round(item.averageResponseTime / item.requests) : 0,
      errorRate: item.requests > 0 ? (item.errors / item.requests) * 100 : 0,
      averageCostPerRequest: item.requests > 0 ? item.totalCost / item.requests : 0,
      mostUsedModel: Object.keys(item.models).reduce((a, b) => 
        item.models[a] > item.models[b] ? a : b, Object.keys(item.models)[0] || 'none'
      ),
    }));

    // Get rate limit status
    const { data: rateLimit } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Calculate totals
    const totals = {
      totalRequests: usage.reduce((sum, item) => sum + item.requests, 0),
      totalTokens: usage.reduce((sum, item) => sum + item.totalTokens, 0),
      totalCost: usage.reduce((sum, item) => sum + item.totalCost, 0),
      averageResponseTime: usage.length > 0 
        ? usage.reduce((sum, item) => sum + item.averageResponseTime, 0) / usage.length 
        : 0,
      errorRate: usage.length > 0 
        ? usage.reduce((sum, item) => sum + item.errorRate, 0) / usage.length 
        : 0,
    };

    return NextResponse.json({
      usage: usage.sort((a, b) => a.period.localeCompare(b.period)),
      totals,
      rateLimit,
      period,
      days,
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}