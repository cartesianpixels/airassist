import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user (must be authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security check: only allow setting yourself as admin if no admins exist yet
    // or if you're already an admin
    const { data: existingAdmins, error: adminCheckError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin');

    if (adminCheckError) {
      console.error('Error checking existing admins:', adminCheckError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const hasExistingAdmins = existingAdmins && existingAdmins.length > 0;
    const isCurrentUserAdmin = existingAdmins?.some(admin => admin.id === user.id);

    // If there are existing admins and current user is not one of them, deny access
    if (hasExistingAdmins && !isCurrentUserAdmin && user.email !== userEmail) {
      return NextResponse.json(
        { error: 'Admin setup can only be performed by existing admins or as initial setup' },
        { status: 403 }
      );
    }

    // Find the target user by email
    const { data: targetProfiles, error: userError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', userEmail);

    if (userError) {
      console.error('Error finding user:', userError);
      return NextResponse.json({ error: 'Error finding user' }, { status: 500 });
    }

    if (!targetProfiles || targetProfiles.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Make sure the user has signed up first.' },
        { status: 404 }
      );
    }

    const targetProfile = targetProfiles[0];

    // Update user role to admin (using proper role column, not metadata)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetProfile.id);

    if (updateError) {
      console.error('Error updating user to admin:', updateError);
      return NextResponse.json({ error: 'Failed to set admin role' }, { status: 500 });
    }

    // Track the admin setup event
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: 'admin_role_granted',
          event_data: {
            targetUserId: targetProfile.id,
            targetUserEmail: userEmail,
            isInitialSetup: !hasExistingAdmins
          }
        });
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      message: `User ${userEmail} has been granted admin access`,
      isInitialSetup: !hasExistingAdmins
    });

  } catch (error) {
    console.error('Error in admin setup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check admin setup status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if any admins exist
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error checking admins:', adminError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check if current user is admin
    const isCurrentUserAdmin = admins?.some(admin => admin.id === user.id) || false;

    return NextResponse.json({
      hasAdmins: admins && admins.length > 0,
      isCurrentUserAdmin,
      adminCount: admins?.length || 0,
      currentUserEmail: user.email
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}