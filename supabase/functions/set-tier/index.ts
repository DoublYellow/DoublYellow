import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * set-tier — RevenueCat webhook handler
 *
 * RevenueCat calls this endpoint (server-to-server) whenever a subscription
 * event occurs: purchase, renewal, cancellation, expiry, refund, etc.
 * It uses a shared secret (REVENUECAT_WEBHOOK_SECRET env var) in the
 * Authorization header rather than a user JWT.
 *
 * RevenueCat dashboard → Project → Integrations → Webhooks
 * URL: https://<your-project>.supabase.co/functions/v1/set-tier
 * Authorization header value: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *
 * The app_user_id sent by RevenueCat must be the user's Supabase UUID.
 * This is set automatically via Purchases.logIn(session.user.id) in _layout.tsx.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maps RevenueCat product identifiers → DoublYellow tier names.
// Update these to match the product IDs you create in App Store Connect / Google Play.
const PRODUCT_TO_TIER: Record<string, string> = {
  'doubleyellow_pro_monthly': 'pro',
  'doubleyellow_unlimited_monthly': 'unlimited',
  // Add annual variants here if you create them:
  // 'doubleyellow_pro_annual': 'pro',
  // 'doubleyellow_unlimited_annual': 'unlimited',
};

// Events that mean the subscription is active
const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIBER_ALIAS',
  'TRANSFER',
]);

// Events that mean the subscription is no longer active
const INACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUES_DETECTED',
  'PRODUCT_CHANGE', // handled separately — RC sends both old expiry and new purchase
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

    // ── App-side optimistic update (called from plans.tsx after purchase) ──────
    // When REVENUECAT_WEBHOOK_SECRET is set we only allow the webhook.
    // While it's not set (i.e. during setup), we fall through to JWT auth.
    const isWebhook = webhookSecret && authHeader === `Bearer ${webhookSecret}`;

    if (isWebhook) {
      // Parse RevenueCat webhook payload
      const body = await req.json();
      const event = body?.event ?? {};
      const eventType: string = event.type ?? '';
      const appUserId: string = event.app_user_id ?? '';
      const productId: string = event.product_id ?? '';

      if (!appUserId) {
        return new Response(JSON.stringify({ error: 'Missing app_user_id' }), { status: 400 });
      }

      let newTier: string | null = null;

      if (ACTIVE_EVENTS.has(eventType) && eventType !== 'PRODUCT_CHANGE') {
        newTier = PRODUCT_TO_TIER[productId] ?? null;
        if (!newTier) {
          // Unknown product — log and return 200 so RC doesn't retry
          console.warn(`Unknown product_id: ${productId}`);
          return new Response(JSON.stringify({ ok: true, note: 'unrecognised product' }), { status: 200 });
        }
      } else if (eventType === 'PRODUCT_CHANGE') {
        // RC sends PRODUCT_CHANGE with new product_id
        newTier = PRODUCT_TO_TIER[productId] ?? 'free';
      } else if (INACTIVE_EVENTS.has(eventType)) {
        newTier = 'free';
      } else {
        // Unhandled event type — acknowledge and ignore
        return new Response(JSON.stringify({ ok: true, note: `ignored event: ${eventType}` }), { status: 200 });
      }

      if (newTier) {
        const { error } = await admin
          .from('profiles')
          .update({ tier: newTier })
          .eq('id', appUserId);

        if (error) {
          console.error('Profile update error:', error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        console.log(`set-tier webhook: ${appUserId} → ${newTier} (${eventType})`);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ── Fallback: JWT-authenticated call from the app ─────────────────────────
    // Used for optimistic UI updates immediately after purchase.
    // The webhook is the real source of truth.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { tier, source } = body;

    // Only allow optimistic updates from the app (not arbitrary tier changes)
    if (source !== 'app_purchase' || !tier || !['pro', 'unlimited'].includes(tier)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: corsHeaders });
    }

    const { error } = await admin
      .from('profiles')
      .update({ tier })
      .eq('id', user.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, tier }), { status: 200, headers: corsHeaders });

  } catch (e) {
    console.error('ERROR:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
