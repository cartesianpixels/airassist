import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: '3.0.0', // Updated for Supabase version
    services: {
      supabase: 'unknown',
      openai: 'unknown',
    },
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check Supabase connection
    const supabase = createClient();
    const { data, error } = await supabase.from('knowledge_base').select('count', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    checks.services.supabase = 'healthy';
  } catch (error) {
    console.error('Supabase health check failed:', error);
    checks.services.supabase = 'unhealthy';
    checks.status = 'degraded';
  }

  try {
    // Check OpenAI API key is configured
    if (process.env.OPENAI_API_KEY) {
      checks.services.openai = 'configured';
    } else {
      checks.services.openai = 'not_configured';
      checks.status = 'degraded';
    }
  } catch (error) {
    console.error('OpenAI check failed:', error);
    checks.services.openai = 'unhealthy';
    checks.status = 'degraded';
  }

  // Determine overall status
  const unhealthyServices = Object.values(checks.services).filter(status =>
    status === 'unhealthy' || status === 'not_configured'
  );

  if (unhealthyServices.length > 0) {
    checks.status = unhealthyServices.length === Object.keys(checks.services).length ? 'unhealthy' : 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: statusCode });
}