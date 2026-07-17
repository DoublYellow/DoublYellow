import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FCM_PROJECT_ID = 'doublyellow-ac481';
const FCM_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@doublyellow-ac481.iam.gserviceaccount.com';
const FCM_PRIVATE_KEY = Deno.env.get('FCM_PRIVATE_KEY')!;

async function getAccessToken(): Promise<string> {
  const pemContents = FCM_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: FCM_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    cryptoKey
  );

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function getDistanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const report = payload.record;
    console.log('Report received:', JSON.stringify(report));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only notify sessions created within the last 2 hours
    const sessionCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: sessions, error: sessionsError } = await supabase
      .from('parked_sessions')
      .select('user_id, latitude, longitude, radius_metres')
      .eq('is_active', true)
      .gte('created_at', sessionCutoff);

    console.log('Active sessions:', JSON.stringify(sessions), 'Error:', JSON.stringify(sessionsError));

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active sessions' }), { status: 200 });
    }

    const accessToken = await getAccessToken();

    // Look up reporter's tier to determine raffle tickets per save
    let ticketsPerSave = 1;
    if (report.user_id) {
      const { data: reporterProfile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', report.user_id)
        .single();
      if (reporterProfile?.tier === 'unlimited') ticketsPerSave = 3;
      else if (reporterProfile?.tier === 'pro') ticketsPerSave = 2;
    }

    // Count how many drivers we successfully alert — each one earns the reporter raffle tickets
    let saveCount = 0;

    for (const session of sessions) {
      // Don't alert the reporter themselves if they somehow have an active session
      if (session.user_id === report.user_id) continue;

      const distance = getDistanceMetres(
        session.latitude,
        session.longitude,
        report.latitude,
        report.longitude
      );

      console.log(`Distance: ${distance}m, radius: ${session.radius_metres}m`);

      if (distance > session.radius_metres) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', session.user_id)
        .single();

      console.log('Push token:', profile?.push_token);

      if (!profile?.push_token) continue;

      const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: profile.push_token,
            notification: {
              title: report.photo_verified ? '📷 VERIFIED: Warden Spotted' : '⚠️ Warden Spotted',
              body: report.photo_verified
                ? `Verified sighting ${Math.round(distance)}m from your car — move it!`
                : `Unverified report ${Math.round(distance)}m from your car.`,
            },
            android: {
              priority: 'high',
              notification: {
                channel_id: 'warden-alerts',
                sound: 'default',
              },
            },
          },
        }),
      });

      const fcmData = await fcmRes.json();
      console.log('FCM response:', JSON.stringify(fcmData));

      // Count as a save if FCM accepted the message
      if (fcmRes.status === 200 && !fcmData.error) {
        saveCount++;
      }
    }

    // Credit raffle tickets to the reporter for each driver they saved (multiplied by tier)
    if (saveCount > 0 && report.user_id) {
      const { error: ticketError } = await supabase.rpc('increment_raffle_tickets', {
        p_user_id: report.user_id,
        p_count: saveCount * ticketsPerSave,
      });
      if (ticketError) {
        console.log('Raffle ticket error:', JSON.stringify(ticketError));
      } else {
        console.log(`Credited ${saveCount} raffle ticket(s) to reporter ${report.user_id}`);
      }
    }

    return new Response(JSON.stringify({ message: 'Notifications sent', saves: saveCount }), { status: 200 });
  } catch (e) {
    console.log('ERROR:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
