import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting configuration
const RATE_LIMITS = {
  free: { requests: 100, window: 24 * 60 * 60 * 1000 }, // 100 requests per day
  basic: { requests: 1000, window: 24 * 60 * 60 * 1000 }, // 1000 requests per day
  pro: { requests: 10000, window: 24 * 60 * 60 * 1000 }, // 10k requests per day
  enterprise: { requests: -1, window: 24 * 60 * 60 * 1000 }, // unlimited
} as const;

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number; tier: keyof typeof RATE_LIMITS }>();

async function checkRateLimit(userId: string, userTier: keyof typeof RATE_LIMITS = 'free'): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
  const config = RATE_LIMITS[userTier];
  const now = Date.now();
  const key = `${userId}:${userTier}`;

  if (config.requests === -1) {
    // Unlimited
    return { allowed: true, limit: -1, remaining: -1, resetTime: now + config.window };
  }

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or first request
    rateLimitStore.set(key, { count: 1, resetTime: now + config.window, tier: userTier });
    return { allowed: true, limit: config.requests, remaining: config.requests - 1, resetTime: now + config.window };
  }

  if (current.count >= config.requests) {
    // Rate limited
    return { allowed: false, limit: config.requests, remaining: 0, resetTime: current.resetTime };
  }

  // Increment and allow
  current.count++;
  rateLimitStore.set(key, current);
  return { allowed: true, limit: config.requests, remaining: config.requests - current.count, resetTime: current.resetTime };
}

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next();

    // Basic CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }

    // Skip middleware for static files and internal Next.js routes
    const { pathname } = request.nextUrl;
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.includes('.') ||
      pathname === '/favicon.ico'
    ) {
      return response;
    }

    // Basic rate limiting for API routes (client-side will handle detailed auth)
    if (pathname.startsWith('/api/')) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const rateCheck = await checkRateLimit(ip, 'free'); // Default to free tier for IP-based limiting

      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateCheck.limit.toString(),
              'X-RateLimit-Remaining': rateCheck.remaining.toString(),
              'X-RateLimit-Reset': rateCheck.resetTime.toString(),
            }
          }
        );
      }

      // Set rate limit headers
      response.headers.set('X-RateLimit-Limit', rateCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateCheck.resetTime.toString());
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}