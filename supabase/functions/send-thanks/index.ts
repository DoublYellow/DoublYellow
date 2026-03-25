import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  try {
    const { to_user_id, from_user_id, type } = await req.json();

    if (!to_user_id || !from_user_id || !type) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: toProfile }, { data: fromProfile }] = await Promise.all([
      supabase.from('profiles').select('push_token').eq('id', to_user_id).single(),
      supabase.from('profiles').select('username').eq('id', from_user_id).single(),
    ]);

    // Record the thanks in the database
    const { error: insertError } = await supabase
      .from('thanks')
      .insert({ from_user_id, to_user_id, type });

    if (insertError) {
      console.log('thanks_insert_error:', insertError.message);
    }

    // Send push notification via Expo
    const pushToken = toProfile?.push_token;
    if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
      const senderName = fromProfile?.username ? `@${fromProfile.username}` : 'A driver';
      const title = type === 'points' ? '🎁 +10 Points Received!' : '👍 Someone sent you Cheers!';
      const body = type === 'points'
        ? `${senderName} gifted you 10 points for your warden alert!`
        : `${senderName} thanked you for keeping them safe!`;

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({ to: pushToken, title, body, sound: 'default' }),
      });

      const expoJson = await expoRes.json();
      console.log('expo_push_status:', expoRes.status, 'response:', JSON.stringify(expoJson));
    } else {
      console.log('skipping_push: token missing or not an Expo token:', pushToken?.substring(0, 20) ?? 'null');
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.log('caught_error:', String(err));
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
