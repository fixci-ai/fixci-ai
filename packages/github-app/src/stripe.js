/**
 * Stripe Integration for FixCI
 * Handles subscription creation, updates, and payment events
 */

import { logBillingEvent, getTierConfig } from './subscription.js';

const STRIPE_API_URL = 'https://api.stripe.com/v1';
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyStripeSignature(signatureHeader, payload, secret) {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = signatureHeader.split(',').map(part => part.trim());
  const timestampPart = parts.find(part => part.startsWith('t='));
  const signaturePart = parts.find(part => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.split('=')[1], 10);
  const signature = signaturePart.split('=')[1];
  if (!timestamp || !signature) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  return timingSafeEqualString(expected, signature);
}

/**
 * Create Stripe checkout session for upgrading subscription
 */
export async function createCheckoutSession(installationId, tier, env) {
  const installation = await env.DB.prepare(
    'SELECT * FROM installations WHERE installation_id = ?'
  ).bind(installationId).first();

  if (!installation) {
    throw new Error('Installation not found');
  }

  const subscription = await env.DB.prepare(
    'SELECT * FROM subscriptions WHERE installation_id = ?'
  ).bind(installationId).first();

  // Get Stripe price ID for tier
  const priceId = getPriceIdForTier(tier, env);
  if (!priceId) {
    throw new Error(`No price ID configured for tier: ${tier}`);
  }

  const params = new URLSearchParams({
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'client_reference_id': installationId.toString(),
    'success_url': `https://fixci.dev/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `https://fixci.dev/billing/cancel`,
    'metadata[installation_id]': installationId.toString(),
    'metadata[tier]': tier,
  });

  // Add existing customer if available
  if (subscription?.stripe_customer_id) {
    params.append('customer', subscription.stripe_customer_id);
  } else {
    // Create email for new customer
    const email = `${installation.account_login}@users.noreply.github.com`;
    params.append('customer_email', email);
  }

  const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe API error: ${error}`);
  }

  const session = await response.json();
  return session;
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature');
  const body = await request.text();

  if (!signature) {
    console.error('Missing Stripe webhook signature');
    return new Response('Missing signature', { status: 401 });
  }

  const isValid = await verifyStripeSignature(signature, body, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error('Invalid Stripe webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (error) {
    console.error('Invalid Stripe webhook payload:', error);
    return new Response('Invalid payload', { status: 400 });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, env);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, env);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, env);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session, env) {
  const installationId = parseInt(session.metadata.installation_id);
  const tier = session.metadata.tier;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log(`Checkout completed for installation ${installationId}, tier: ${tier}`);

  // Get tier configuration
  const tierConfig = await getTierConfig(tier, env);

  // Update subscription in database
  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      tier = ?,
      stripe_customer_id = ?,
      stripe_subscription_id = ?,
      analyses_limit_monthly = ?,
      status = 'active',
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(tier, customerId, subscriptionId, tierConfig.analyses_limit, installationId).run();

  // Log billing event
  await logBillingEvent(
    installationId,
    'subscription_created',
    tierConfig.price_monthly_usd,
    { tier, customerId, subscriptionId },
    env
  );
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(subscription, env) {
  const customerId = subscription.customer;

  // Find installation by customer ID
  const record = await env.DB.prepare(
    'SELECT installation_id FROM subscriptions WHERE stripe_customer_id = ?'
  ).bind(customerId).first();

  if (!record) {
    console.warn(`No subscription found for Stripe customer ${customerId}`);
    return;
  }

  const status = subscription.status; // 'active', 'past_due', 'canceled', etc.

  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      status = ?,
      stripe_subscription_id = ?,
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(status, subscription.id, record.installation_id).run();

  console.log(`Subscription updated for installation ${record.installation_id}: ${status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription, env) {
  const customerId = subscription.customer;

  const record = await env.DB.prepare(
    'SELECT installation_id FROM subscriptions WHERE stripe_customer_id = ?'
  ).bind(customerId).first();

  if (!record) return;

  // Downgrade to free tier
  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      tier = 'free',
      status = 'active',
      analyses_limit_monthly = 10,
      stripe_subscription_id = NULL,
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(record.installation_id).run();

  await logBillingEvent(
    record.installation_id,
    'subscription_cancelled',
    0,
    { customerId },
    env
  );

  console.log(`Subscription cancelled for installation ${record.installation_id}, downgraded to free`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice, env) {
  const customerId = invoice.customer;
  const amountPaid = invoice.amount_paid / 100; // Convert cents to dollars

  const record = await env.DB.prepare(
    'SELECT installation_id FROM subscriptions WHERE stripe_customer_id = ?'
  ).bind(customerId).first();

  if (!record) return;

  await logBillingEvent(
    record.installation_id,
    'payment_succeeded',
    amountPaid,
    { invoiceId: invoice.id },
    env
  );

  console.log(`Payment succeeded for installation ${record.installation_id}: $${amountPaid}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice, env) {
  const customerId = invoice.customer;

  const record = await env.DB.prepare(
    'SELECT installation_id FROM subscriptions WHERE stripe_customer_id = ?'
  ).bind(customerId).first();

  if (!record) return;

  // Update status to past_due
  await env.DB.prepare(`
    UPDATE subscriptions
    SET status = 'past_due', updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(record.installation_id).run();

  await logBillingEvent(
    record.installation_id,
    'payment_failed',
    0,
    { invoiceId: invoice.id },
    env
  );

  console.log(`Payment failed for installation ${record.installation_id}`);
}

/**
 * Get Stripe price ID for tier
 */
function getPriceIdForTier(tier, env) {
  const priceIds = {
    'pro': env.STRIPE_PRICE_ID_PRO || null,
    'enterprise': env.STRIPE_PRICE_ID_ENTERPRISE || null,
  };

  return priceIds[tier] || null;
}

/**
 * Create customer portal session for managing subscription
 */
export async function createPortalSession(installationId, env) {
  const subscription = await env.DB.prepare(
    'SELECT stripe_customer_id FROM subscriptions WHERE installation_id = ?'
  ).bind(installationId).first();

  if (!subscription?.stripe_customer_id) {
    throw new Error('No Stripe customer found for this installation');
  }

  const response = await fetch(`${STRIPE_API_URL}/billing_portal/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'customer': subscription.stripe_customer_id,
      'return_url': 'https://fixci.dev/billing',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create portal session: ${error}`);
  }

  const session = await response.json();
  return session;
}
