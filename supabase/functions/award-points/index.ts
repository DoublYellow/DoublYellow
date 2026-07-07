import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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
    const { report_id } = body;

    if (!report_id) return new Response(JSON.stringify({ error: 'report_id required' }), { status: 400, headers: corsHeaders });

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the report exists, belongs to this user, and hasn't been awarded yet
    const { data: report } = await adminClient
      .from('warden_reports')
      .select('id, user_id, points_awarded, photo_verified, points_processed')
      .eq('id', report_id)
      .eq('user_id', user.id)
      .single();

    if (!report) return new Response(JSON.stringify({ error: 'Report not found' }), { status: 404, headers: corsHeaders });
    if (report.points_processed) return new Response(JSON.stringify({ error: 'Points already awarded' }), { status: 409, headers: corsHeaders });

    const points = report.photo_verified ? 100 : 50;

    // Award points and increment drivers_saved atomically
    const { error: updateError } = await adminClient.rpc('increment_points', {
      p_user_id: user.id,
      p_points: points,
    });

    if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });

    // Mark report as processed
    await adminClient
      .from('warden_reports')
      .update({ points_processed: true })
      .eq('id', report_id);

    return new Response(JSON.stringify({ success: true, points_awarded: points }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
