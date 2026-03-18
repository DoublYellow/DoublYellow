import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FCM_PROJECT_ID = 'doublyellow-ac481';
const FCM_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@doublyellow-ac481.iam.gserviceaccount.com';
// FCM_PRIVATE_KEY is stored as a Supabase Edge Function secret — never hardcode it here
const FCM_PRIVATE_KEY = Deno.env.get('FCM_PRIVATE_KEY')!;

async function getAccessToken(): Promise<string> {
  const pemContents = FCM_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
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

    const { data: sessions, error: sessionsError } = await supabase
      .from('parked_sessions')
      .select('user_id, latitude, longitude, radius_metres')
      .eq('is_active', true);

    console.log('Active sessions:', JSON.stringify(sessions), 'Error:', JSON.stringify(sessionsError));

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active sessions' }), { status: 200 });
    }

    const accessToken = await getAccessToken();

    for (const session of sessions) {
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
              title: '🚨 WARDEN SPOTTED',
              body: `A warden has been reported ${Math.round(distance)}m from your car!`,
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
    }

    return new Response(JSON.stringify({ message: 'Notifications sent' }), { status: 200 });
  } catch (e) {
    console.log('ERROR:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});