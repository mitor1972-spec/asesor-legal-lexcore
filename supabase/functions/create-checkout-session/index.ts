import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lead_id, lawfirm_id } = await req.json();
    if (!lead_id || !lawfirm_id) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user belongs to lawfirm (or is internal)
    const { data: userProfile } = await supabaseAdmin
      .from('profiles').select('lawfirm_id').eq('id', user.id).single();

    const { data: userRole } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id)
      .in('role', ['admin', 'operator']).maybeSingle();

    const isInternal = !!userRole;
    if (!isInternal && userProfile?.lawfirm_id !== lawfirm_id) {
      return new Response(JSON.stringify({ error: 'No autorizado para este despacho' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check lead is available
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads').select('*').eq('id', lead_id).eq('status_internal', 'Pendiente').single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead no disponible' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check exclusivity
    const { data: existingAssignment } = await supabaseAdmin
      .from('lead_assignments').select('id').eq('lead_id', lead_id).maybeSingle();

    if (existingAssignment) {
      return new Response(JSON.stringify({ error: 'Este lead ya ha sido asignado' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Golden rule check
    const fields = lead.structured_fields || {};
    const hasEmail = fields.email && fields.email.trim() !== '';
    const hasPhone = fields.telefono && fields.telefono.trim() !== '';
    if (!hasEmail && !hasPhone) {
      return new Response(JSON.stringify({ error: 'Lead sin contacto válido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const price = lead.marketplace_price || lead.price_final || 5;
    const area = fields.area_legal || fields.legal_area || 'Legal';
    const province = fields.provincia || fields.province || '';

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        payment_gateway: 'stripe',
        amount: price,
        currency: 'EUR',
        status: 'pending',
        lead_id,
        lawfirm_id,
        user_id: user.id,
        metadata: {
          area_legal: area,
          provincia: province,
          lead_score: lead.score_final,
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Error al crear registro de pago');
    }

    // Get lawfirm name for description
    const { data: lawfirm } = await supabaseAdmin
      .from('lawfirms').select('name').eq('id', lawfirm_id).single();

    // Create Stripe Checkout Session with dynamic price
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product: 'prod_UJDdNtqymKtz36',
          unit_amount: Math.round(price * 100), // euros to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://market.asesor.legal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://market.asesor.legal/payment/cancel`,
      metadata: {
        payment_db_id: payment.id,
        lead_id,
        lawfirm_id,
        user_id: user.id,
        area_legal: area,
        provincia: province,
      },
      customer_email: user.email,
    });

    // Update payment with Stripe session ID
    await supabaseAdmin
      .from('payments')
      .update({ transaction_id: session.id })
      .eq('id', payment.id);

    console.log(`[STRIPE CHECKOUT] Session ${session.id} created for lead ${lead_id}, price ${price}€`);

    return new Response(JSON.stringify({ sessionId: session.id, sessionUrl: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-checkout-session:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
