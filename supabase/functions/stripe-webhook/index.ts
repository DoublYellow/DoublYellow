import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

/**
 * stripe-webhook — Stripe subscription event handler
 *
 * Stripe calls this endpoint server-to-server whenever a subscription
 * event occurs: new subscription, renewal, cancellation, expiry, etc.
 *
 * Stripe dashboard → Developers → Webhooks → Add endpoint
 * URL: https://<your-project>.supabase.co/functions/v1/stripe-webhook
 *
 * Events to enable in Stripe dashboard:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 *
 * Required Supabase secrets (supabase secrets set --env-file .env):
 *   STRIPE_SECRET_KEY=sk_live_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * The user's email in Stripe must match their Supabase auth email.
 * This is automatic if they sign up to the app first, then subscribe on the website.
 */

// Maps Stripe price IDs → DoublYellow tier names.
// Update these with the actual Price IDs from your Stripe dashboard.
const PRICE_TO_TIER: Record<string, string> = {
  'price_1TuifZFvVA5SmlCoYF9PLsbY': 'pro',       // Double Yellow Pro — monthly £5.99
  'price_1TuigbFvVA5SmlCoSaNh3S9J': 'pro',       // Double Yellow Pro — annual £59
  'price_1TuijmFvVA5SmlCo7AAQW5Gv': 'unlimited', // Double Yellow Unlimited — monthly £14.99
  'price_1TuikZFvVA5SmlCoaXm8bVf1': 'unlimited', // Double Yellow Unlimited — annual £149
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  // If Stripe isn't configured yet, acknowledge and exit silently
  if (!stripeSecretKey || !webhookSecret) {
    console.log('stripe-webhook: not configured yet, skipping');
    return new Response(JSON.stringify({ ok: true, note: 'not configured' }), { status: 200 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify the webhook signature so we know it's really from Stripe
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  console.log(`stripe-webhook: received event ${event.type}`);

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id ?? '';
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Only activate tier for active/trialling subscriptions
        const isActive = ['active', 'trialing'].includes(status);
        const newTier = isActive ? (PRICE_TO_TIER[priceId] ?? null) : 'free';

        if (!newTier) {
          console.warn(`stripe-webhook: unrecognised price ID ${priceId}`);
          return new Response(JSON.stringify({ ok: true, note: 'unrecognised price' }), { status: 200 });
        }

        const email = await getEmailForCustomer(stripe, customerId);
        if (!email) {
          console.error('stripe-webhook: could not resolve email for customer', customerId);
          return new Response(JSON.stringify({ error: 'Could not resolve customer email' }), { status: 500 });
        }

        await updateTierByEmail(admin, email, newTier);
        console.log(`stripe-webhook: ${email} → ${newTier} (${event.type}, status: ${status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription fully cancelled/expired — revert to free
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const email = await getEmailForCustomer(stripe, customerId);
        if (email) {
          await updateTierByEmail(admin, email, 'free');
          console.log(`stripe-webhook: ${email} → free (subscription deleted)`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed — optionally downgrade or just log
        // For now we log only; Stripe will retry and fire subscription.updated if it stays failed
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`stripe-webhook: payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`stripe-webhook: ignored event type ${event.type}`);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    console.error('stripe-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

/** Fetch the email address for a Stripe customer ID */
async function getEmailForCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email ?? null;
  } catch {
    return null;
  }
}

/** Look up a Supabase user by email and update their tier */
async function updateTierByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
  tier: string
): Promise<void> {
  // Find the user in auth.users by email
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.warn(`stripe-webhook: no Supabase user found for email ${email}`);
    return;
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ tier })
    .eq('id', user.id);

  if (updateError) throw updateError;
}
