import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

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

async function trackAnalytics(request: NextRequest, user: any, response: NextResponse, supabase: any) {
  try {
    // Only track actual page visits and API calls, skip static assets
    const path = request.nextUrl.pathname;
    if (path.includes('/_next/') || path.includes('/api/') || path.includes('.')) {
      return;
    }

    // Generate or get session ID
    let sessionId = request.cookies.get('airassist-session')?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      response.cookies.set('airassist-session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    const analyticsData = {
      user_id: user?.id || null,
      event_type: 'page_view',
      event_data: {
        path: path,
        method: request.method,
        userAgent: request.headers.get('user-agent') || '',
        referrer: request.headers.get('referer') || null,
      },
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };

    // Store in database if user is authenticated
    if (user?.id) {
      await supabase
        .from('analytics_events')
        .insert(analyticsData);
    }

    // Add analytics headers to response
    response.headers.set('x-analytics-tracked', 'true');
    response.headers.set('x-session-id', sessionId);
    response.headers.set('x-user-id', user?.id || 'anonymous');

    console.log('Analytics tracked:', {
      userId: user?.id || 'anonymous',
      path,
      sessionId,
      timestamp: analyticsData.created_at
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/') && user) {
    // TODO: Get user tier from database
    const userTier = 'free' as keyof typeof RATE_LIMITS; // Default to free tier
    
    const rateLimit = await checkRateLimit(user.id, userTier);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    
    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit: rateLimit.limit,
          resetTime: rateLimit.resetTime,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }
  }

  // Protected routes
  const protectedPaths = ['/dashboard', '/settings', '/admin', '/chat']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Admin routes
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Check admin access
  if (isAdminPath && user) {
    try {
      // Check user role from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.log('No profile found for user:', user.id);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const isAdmin = profile.role === 'admin' ||
                     user.email?.includes('admin') || // Fallback for development
                     false;

      if (!isAdmin) {
        console.log('User is not admin:', user.email, 'role:', profile.role);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      console.log('Admin access granted for:', user.email);
    } catch (error) {
      console.error('Error checking admin access:', error);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect to login if accessing protected route without authentication
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add performance timing
  const processingTime = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${processingTime}ms`);

  // Track analytics
  await trackAnalytics(request, user, response, supabase);

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}