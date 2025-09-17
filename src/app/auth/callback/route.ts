import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'

    // Handle OAuth provider errors
    if (error) {
      console.error('OAuth error:', { error, errorDescription })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', error)
      loginUrl.searchParams.set('message', errorDescription || 'Authentication failed')
      return NextResponse.redirect(loginUrl)
    }

    // Handle missing authorization code
    if (!code) {
      console.error('No authorization code provided')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_code')
      loginUrl.searchParams.set('message', 'No authorization code provided')
      return NextResponse.redirect(loginUrl)
    }

    const supabase = await createServerSupabaseClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Error exchanging code for session:', {
        error: exchangeError.message,
        code: exchangeError.status,
        details: exchangeError
      })

      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'exchange_failed')
      loginUrl.searchParams.set('message', exchangeError.message || 'Failed to complete authentication')
      return NextResponse.redirect(loginUrl)
    }

    // Verify we have a valid session and user
    if (!data.session || !data.user) {
      console.error('No session or user after code exchange:', { session: !!data.session, user: !!data.user })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'invalid_session')
      loginUrl.searchParams.set('message', 'Failed to create valid session')
      return NextResponse.redirect(loginUrl)
    }

    console.log('Auth callback successful:', {
      userId: data.user.id,
      email: data.user.email,
      redirectTo
    })

    // Redirect to the intended destination
    return NextResponse.redirect(new URL(redirectTo, request.url))

  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('error', 'unexpected_error')
    loginUrl.searchParams.set('message', 'An unexpected error occurred during authentication')
    return NextResponse.redirect(loginUrl)
  }
}