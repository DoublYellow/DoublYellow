import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FCM_PROJECT_ID = 'doublyellow-ac481';
const FCM_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@doublyellow-ac481.iam.gserviceaccount.com';
const FCM_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/i2AS9NWVDaRH
zFL9HLOHeHPB3s1RCPev8QfHItc4jC+yoo7C/a/KeUwHhElCgcTWXgVWb1EdylBD
H4mG7l0VCoJR/E2Mo2cbXGasafn2KCMb7/9Hslgj23n4TeB/jJOGXLtxEkHGT0YJ
Na/yLZVNFhREgwm2aTGHcQVOVqlacSFE+t1BZxxjxio13UOvmJFlnBsJZ3rJ+Pti
r8WKKddRBuHJdIxHEpmnS5Vaj+FUe5J6UrI4nnna91jzbYP+40sV+6e1NkdR02zI
Y3wtLIal3tTT3Iu46yNWji5p6hrTKMTf3AyVMNoOlpnVGJl+a789u77a9TwtdhcY
GocBx/c/AgMBAAECggEADw3zLKCkNfu+/2RudCjwoVA7XnyJvyzVwgHPMZZDu4fx
6pFyAZ6/u/zhl8hzAf1CDVkrBG3P8c5bYl/7RqjuyIvgmnU0J4tJbzIv4OA2Pn2A
5beGS5b97D+NRatIeEeCHTIMcQKIbrL/V0aQpn4K37N0pb5CbqnnTY5gABXtAWGD
VuZwwNbuPukj/CmC5Cl97ikrDpCTvUawQ9KYLZX992dU/h2WUVWRxt1g/i5cKLW4
GpBGEHuU+1mpnPPtgZHVeSmuQGSQWhnnHQGIT1ice9ioOrbHzXYkmuATu8G7/IOZ
QsAxHwWXYSVYRGmJU9irvaf1eZTGEVcvw4BnZ/mjfQKBgQDxCZRqdZD7d/6K4nNj
JFDD3Xp++GDtROpOOe1cBNsLnBNOOSStJ/DCCPibU/G4esof9qIRHEErSQmqTCu4
MpmvhnJc7SsEQcGBu1pAbzUYGyUJw29asS+OjGO8jPbid0Eh562SAY6KXQk4Kd1L
JhBE7bMIKTHW9JUF8NPJru/QLQKBgQDLb0h3eVhX7U5mMMXYK8IAMYERUTYmfSia
VlYdoTX84qA6yDsECamT2IPg7y04HBp7lJ+3C6xDHhcfvDBLNEcmfMbdY1Dt5L5l
gaZmKDqqH9qL+Kyki8N9er76WQILJPtnT+ExEI3y+eyduTypLssTLcA+lRBkrL4A
301k3RAcmwKBgHgxdri/d1RuOZe35CID8eI5huPZpzupqczoRdwk77WSVm4jQI63
4+5d2tpZuadsU24s5hPyKu0Stqcc5JAta0WDnXOJMHIm9/9hFVgcHDWxE38S3Wwz
/qruhq12/YVgQjJN/NdZv2JvkjFXbuoSSPqWLThckmXGAKm9tV5UxXDhAoGAHZqf
IAu/iGQXMZXNZKzReXe6wYtg5u71tqfztjIciiVsjcFPnUHOtJ4gat5DZVPpoqw5
JckEE2xQjySynm8IH5iu0869GzFbZ6gbT+hwyQsDobTZYsSX+S2glwvW2UpTb3BX
Y+11yrMF9Nnc8v3FPZA91p2Ymh3tNHFKcPAehRsCgYEA15h1Xl15+H7sNy+Jma83
0I6evZXz4/mFZFT8ylTfR+XeKL/KzMuU3dk31D7JV6VjEKM3BrFX1l4WpmBrOasV
5Vg7b7huKSCkv57UdYqY899jI0vs270/WQH5MJcLmbTum9I9XRmw6Zcr5NQUfR/J
k0WU2dwFxmoYlqyCLkgo+mw=
-----END PRIVATE KEY-----`;

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