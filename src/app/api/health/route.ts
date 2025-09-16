import { NextResponse } from 'next/server';
import { getDatabase, getRedis } from '@/lib/database-pg';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version || '2.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
      qdrant: 'unknown',
    },
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check PostgreSQL connection
    const db = getDatabase();
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    checks.services.database = 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
  }

  try {
    // Check Redis connection
    const redis = getRedis();
    await redis.ping();
    checks.services.redis = 'healthy';
  } catch (error) {
    console.error('Redis health check failed:', error);
    checks.services.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  try {
    // Check Qdrant connection
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const response = await fetch(`${qdrantUrl}/health`, { signal: AbortSignal.timeout(5000) });
    checks.services.qdrant = response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    console.error('Qdrant health check failed:', error);
    checks.services.qdrant = 'unhealthy';
    checks.status = 'degraded';
  }

  // Determine overall status
  const unhealthyServices = Object.values(checks.services).filter(status => status === 'unhealthy');
  if (unhealthyServices.length > 0) {
    checks.status = unhealthyServices.length === Object.keys(checks.services).length ? 'unhealthy' : 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: statusCode });
}