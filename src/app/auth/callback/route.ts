import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'

    console.log('🔄 AUTH CALLBACK START:', {
      url: request.url,
      code: code ? `${code.substring(0, 8)}...` : null,
      error,
      errorDescription,
      redirectTo
    })

    // Handle OAuth provider errors
    if (error) {
      console.error('❌ OAuth error:', { error, errorDescription })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', error)
      loginUrl.searchParams.set('message', errorDescription || 'Authentication failed')
      return NextResponse.redirect(loginUrl)
    }

    // Handle missing authorization code
    if (!code) {
      console.error('❌ No authorization code provided')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'no_code')
      loginUrl.searchParams.set('message', 'No authorization code provided')
      return NextResponse.redirect(loginUrl)
    }

    console.log('🔄 Creating server supabase client...')
    const supabase = await createServerSupabaseClient()

    console.log('🔄 Exchanging code for session...')
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Error exchanging code for session:', {
        error: exchangeError.message,
        code: exchangeError.status,
        details: exchangeError
      })

      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'exchange_failed')
      loginUrl.searchParams.set('message', exchangeError.message || 'Failed to complete authentication')
      return NextResponse.redirect(loginUrl)
    }

    console.log('✅ Code exchange successful:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id,
      email: data.user?.email
    })

    // Verify we have a valid session and user
    if (!data.session || !data.user) {
      console.error('❌ No session or user after code exchange:', { session: !!data.session, user: !!data.user })
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'invalid_session')
      loginUrl.searchParams.set('message', 'Failed to create valid session')
      return NextResponse.redirect(loginUrl)
    }

    console.log('🎉 AUTH CALLBACK SUCCESSFUL - Redirecting to:', redirectTo)
    console.log('👤 User details:', {
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata,
      appMetadata: data.user.app_metadata
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