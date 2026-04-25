import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[STRIPE WEBHOOK] Event: ${event.type}, ID: ${event.id}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { payment_db_id, lead_id, lawfirm_id, user_id } = session.metadata || {};

        if (!payment_db_id || !lead_id || !lawfirm_id) {
          console.error('Missing metadata in checkout session');
          break;
        }

        // Update payment status
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'completed',
            transaction_id: session.id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment_db_id);

        const amountPaid = (session.amount_total || 0) / 100;

        // Get lawfirm for balance update
        const { data: lawfirm } = await supabaseAdmin
          .from('lawfirms')
          .select('id, name, marketplace_balance')
          .eq('id', lawfirm_id)
          .single();

        // Remove lead from marketplace and update status
        await supabaseAdmin
          .from('leads')
          .update({ is_in_marketplace: false, status_internal: 'Enviado' })
          .eq('id', lead_id);

        // Create lead assignment
        await supabaseAdmin
          .from('lead_assignments')
          .insert({
            lead_id,
            lawfirm_id,
            assigned_by_user_id: user_id,
            status_delivery: 'delivered',
            firm_status: 'received',
            service_type: 'stripe',
            is_commission: false,
            lead_cost: amountPaid,
          });

        // Create balance transaction (record the Stripe payment)
        await supabaseAdmin
          .from('balance_transactions')
          .insert({
            lawfirm_id,
            type: 'stripe_purchase',
            amount: -amountPaid,
            description: `Compra de lead vía Stripe (${session.id})`,
            reference_id: lead_id,
            balance_before: lawfirm?.marketplace_balance || 0,
            balance_after: lawfirm?.marketplace_balance || 0, // balance unchanged for stripe
            created_by: user_id,
          });

        // Log in lead history
        await supabaseAdmin
          .from('lead_history')
          .insert({
            lead_id,
            user_id,
            action: 'purchased_stripe',
            details: {
              lawfirm_id,
              lawfirm_name: lawfirm?.name,
              price_paid: amountPaid,
              stripe_session_id: session.id,
            },
          });

        console.log(`[STRIPE] Lead ${lead_id} purchased by lawfirm ${lawfirm_id} for ${amountPaid}€`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[STRIPE] Payment failed: ${paymentIntent.id}`);

        // Find and update any pending payment with this intent
        // The transaction_id might be the checkout session, not the payment intent
        // so we log the failure for monitoring
        break;
      }

      default:
        console.log(`[STRIPE] Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
