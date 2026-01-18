import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, lawfirm_id } = await req.json();

    if (!lead_id || !lawfirm_id) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .eq('is_in_marketplace', true)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead no disponible en el marketplace' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lawfirm balance
    const { data: lawfirm, error: lawfirmError } = await supabaseAdmin
      .from('lawfirms')
      .select('id, name, marketplace_balance')
      .eq('id', lawfirm_id)
      .single();

    if (lawfirmError || !lawfirm) {
      return new Response(
        JSON.stringify({ error: 'Despacho no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const price = lead.marketplace_price || lead.price_final || 0;
    const currentBalance = lawfirm.marketplace_balance || 0;

    if (currentBalance < price) {
      return new Response(
        JSON.stringify({ error: 'Saldo insuficiente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newBalance = currentBalance - price;

    // Start transaction-like operations
    // 1. Update lawfirm balance
    const { error: balanceError } = await supabaseAdmin
      .from('lawfirms')
      .update({ marketplace_balance: newBalance })
      .eq('id', lawfirm_id);

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      throw new Error('Error al actualizar saldo');
    }

    // 2. Create purchase record
    const { error: purchaseError } = await supabaseAdmin
      .from('lead_purchases')
      .insert({
        lead_id,
        lawfirm_id,
        user_id: user.id,
        price_paid: price,
        previous_balance: currentBalance,
        new_balance: newBalance,
      });

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      // Rollback balance
      await supabaseAdmin
        .from('lawfirms')
        .update({ marketplace_balance: currentBalance })
        .eq('id', lawfirm_id);
      throw new Error('Error al registrar compra');
    }

    // 3. Create balance transaction record
    await supabaseAdmin
      .from('balance_transactions')
      .insert({
        lawfirm_id,
        type: 'purchase',
        amount: -price,
        description: `Compra de lead en LeadsMarket`,
        reference_id: lead_id,
        balance_before: currentBalance,
        balance_after: newBalance,
        created_by: user.id,
      });

    // 4. Remove lead from marketplace and update status
    const { error: leadUpdateError } = await supabaseAdmin
      .from('leads')
      .update({
        is_in_marketplace: false,
        status_internal: 'Enviado',
      })
      .eq('id', lead_id);

    if (leadUpdateError) {
      console.error('Error updating lead:', leadUpdateError);
    }

    // 5. Create lead assignment
    const { error: assignmentError } = await supabaseAdmin
      .from('lead_assignments')
      .insert({
        lead_id,
        lawfirm_id,
        assigned_by_user_id: user.id,
        status_delivery: 'delivered',
        firm_status: 'received',
        service_type: 'marketplace',
      });

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
    }

    // 6. Log the purchase in lead history
    await supabaseAdmin
      .from('lead_history')
      .insert({
        lead_id,
        user_id: user.id,
        action: 'purchased_marketplace',
        details: {
          lawfirm_id,
          lawfirm_name: lawfirm.name,
          price_paid: price,
        },
      });

    console.log(`Lead ${lead_id} purchased by lawfirm ${lawfirm_id} for ${price}€`);

    return new Response(
      JSON.stringify({ 
        success: true,
        purchase: {
          lead_id,
          price_paid: price,
          new_balance: newBalance,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in purchase-lead function:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
