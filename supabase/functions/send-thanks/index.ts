import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '';

// ─── Convert PEM private key to DER format ───────────────────────────────────
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Use a loop rather than spread to avoid call-stack limits on large buffers
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ─── Get OAuth2 access token from Google using service account ────────────────
async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${arrayBufferToBase64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const json = await res.json();
  console.log('token_exchange_status:', res.status, 'token_prefix:', json.access_token?.substring(0, 8) ?? 'NONE');
  return json.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────

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

    console.log('push_token:', toProfile?.push_token ? 'present' : 'NULL');
    console.log('has_service_account:', !!FIREBASE_SERVICE_ACCOUNT);

    // Record the thanks in the database
    const { error: insertError } = await supabase.from('thanks').insert({ from_user_id, to_user_id, type });
    console.log('thanks_insert:', insertError ? insertError.message : 'ok');

    if (toProfile?.push_token && FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
      const accessToken = await getAccessToken(serviceAccount);
      const senderName = fromProfile?.username ? `@${fromProfile.username}` : 'A driver';

      const title = type === 'points' ? '🎁 +10 Points Received!' : '👍 Someone sent you Cheers!';
      const body = type === 'points'
        ? `${senderName} gifted you 10 points for your warden alert!`
        : `${senderName} thanked you for keeping them safe!`;

      const fcmRes = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: toProfile.push_token,
              notification: { title, body },
              android: { priority: 'high' },
              apns: { headers: { 'apns-priority': '10' } },
            },
          }),
        }
      );
      const fcmJson = await fcmRes.json();
      console.log('fcm_status:', fcmRes.status, 'fcm_response:', JSON.stringify(fcmJson));
    } else {
      console.log('skipping_fcm: no push_token or no service account');
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.log('caught_error:', String(err));
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
