import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TIERS = ['free', 'pro', 'unlimited'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Use service role to verify the request came from a trusted source
    // In production this should verify a purchase receipt from Google Play
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { tier, purchase_token } = body;

    if (!tier || !VALID_TIERS.includes(tier)) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400, headers: corsHeaders });
    }

    // TODO: When paid tiers launch, verify purchase_token against Google Play Billing API here
    // For beta: only allow setting to 'unlimited' (everything is free)
    if (tier !== 'unlimited') {
      // Placeholder: in production, verify receipt before allowing paid tier
      // For now, reject any attempt to set paid tiers client-side
      return new Response(JSON.stringify({ error: 'Paid tiers not yet available' }), { status: 403, headers: corsHeaders });
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ tier })
      .eq('id', user.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ success: true, tier }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
