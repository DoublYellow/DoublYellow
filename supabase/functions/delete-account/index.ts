import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Verify the user's JWT and get their ID
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Use service role to delete all user data and the auth user
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data across all tables (profiles has cascade but belt-and-braces)
    await admin.from('parked_sessions').delete().eq('user_id', user.id);
    await admin.from('warden_reports').delete().eq('user_id', user.id);
    await admin.from('settings').delete().eq('user_id', user.id);
    await admin.from('thanks').delete().eq('from_user_id', user.id);
    await admin.from('profiles').delete().eq('id', user.id);

    // Delete the auth user itself — this is irreversible
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Auth delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('ERROR:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
