import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { email, password, orgName } = await request.json();

  if (!email || !password || !orgName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Service-role client — bypasses RLS for all DB operations
  const supabase = createServiceClient();

  // 1. Sign up the user (uses service role so email is auto-confirmed)
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { org_name: orgName.trim() } },
  });

  if (signUpError || !authData.user) {
    console.error('[register] signUp error:', signUpError);
    return NextResponse.json(
      { error: signUpError?.message ?? 'Registration failed' },
      { status: 400 },
    );
  }

  const userId = authData.user.id;

  // 2. The handle_new_user trigger should have created a profile row.
  //    If it didn't (e.g., trigger missing), create it ourselves.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingProfile) {
    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert({ id: userId });

    if (profileInsertError) {
      console.error('[register] profile insert error:', profileInsertError);
    }
  }

  // 3. Call register_organization RPC using the new user's own session.
  // The function is SECURITY DEFINER so it runs as DB owner and bypasses RLS.
  // We need a client with the user's specific access token to set auth.uid().
  
  if (!authData.session) {
    // If auto-confirm is somehow off, session will be null
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'Email confirmation is required on your Supabase project. Turn it off.' },
      { status: 400 }
    );
  }

  const authedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } } },
  );

  const { error: rpcError } = await authedClient.rpc('register_organization', {
    org_name: orgName.trim(),
  });

  if (rpcError) {
    console.error('[register] RPC error:', rpcError);
    // Cleanup the user if org creation failed
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'Failed to create organization: ' + rpcError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
