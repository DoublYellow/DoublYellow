import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const updates: Record<string, string> = {};

    // Validate username
    if (body.username !== undefined) {
      const username = String(body.username).trim();
      if (username.length < 3) return new Response(JSON.stringify({ error: 'Username must be at least 3 characters.' }), { status: 400, headers: corsHeaders });
      if (username.length > 20) return new Response(JSON.stringify({ error: 'Username must be 20 characters or fewer.' }), { status: 400, headers: corsHeaders });
      if (username.includes('@')) return new Response(JSON.stringify({ error: 'Username cannot be an email address.' }), { status: 400, headers: corsHeaders });
      if (username.includes(' ')) return new Response(JSON.stringify({ error: 'Username cannot contain spaces.' }), { status: 400, headers: corsHeaders });
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) return new Response(JSON.stringify({ error: 'Username can only contain letters, numbers, underscores, hyphens and dots.' }), { status: 400, headers: corsHeaders });
      updates.username = username;
    }

    // Validate avatar_url
    if (body.avatar_url !== undefined) {
      const url = String(body.avatar_url).trim();
      if (url.length > 500) return new Response(JSON.stringify({ error: 'Invalid avatar URL.' }), { status: 400, headers: corsHeaders });
      updates.avatar_url = url;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update.' }), { status: 400, headers: corsHeaders });
    }

    // Use service role to apply the update
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check username uniqueness if changing username
    if (updates.username) {
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', updates.username)
        .neq('id', user.id)
        .single();
      if (existing) return new Response(JSON.stringify({ error: 'Username already taken.' }), { status: 409, headers: corsHeaders });
    }

    const { error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
