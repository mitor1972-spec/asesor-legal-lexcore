import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { buildCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

serve(async (req) => {
  const __pre = handleCorsPreflight(req); if (__pre) return __pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- AUTH ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, lawfirm_id, is_commission, commission_percent } = await req.json();

    if (!lead_id || !lawfirm_id) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- AUTHORIZATION: user belongs to lawfirm OR is internal (admin/operator) ----
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('lawfirm_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil de usuario no encontrado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'operator'])
      .maybeSingle();

    const isInternalUser = !!userRole;

    if (!isInternalUser && userProfile.lawfirm_id !== lawfirm_id) {
      console.warn(`[SECURITY] User ${user.id} tried to purchase for lawfirm ${lawfirm_id} but belongs to ${userProfile.lawfirm_id}`);
      return new Response(
        JSON.stringify({ error: 'No autorizado: solo puedes comprar para tu propio despacho' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isInternalUser) {
      console.log(`[IMPERSONATION] Internal user ${user.id} purchasing for lawfirm ${lawfirm_id}`);
    }

    // ---- ATOMIC PURCHASE via RPC ----
    // Single transaction with FOR UPDATE locking on leads + lawfirms.
    // Handles: golden rule, exclusivity, balance check, deduction, assignment, history.
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('purchase_lead_atomic', {
      _lead_id: lead_id,
      _lawfirm_id: lawfirm_id,
      _user_id: user.id,
      _is_commission: !!is_commission,
      _commission_percent: is_commission ? (commission_percent ?? 20) : null,
    });

    if (rpcError) {
      console.error('[PURCHASE RPC ERROR]', rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message || 'Error interno al procesar la compra' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = rpcResult as Record<string, unknown>;

    if (!result?.success) {
      const code = (result?.code as string) || 'UNKNOWN';
      const status =
        code === 'ALREADY_ASSIGNED' ? 409 :
        code === 'INSUFFICIENT_BALANCE' ? 400 :
        code === 'NO_CONTACT' ? 400 :
        code === 'LEAD_UNAVAILABLE' || code === 'LEAD_NOT_FOUND' ? 404 :
        code === 'LAWFIRM_NOT_FOUND' ? 404 :
        500;

      console.warn(`[PURCHASE FAILED] code=${code} lead=${lead_id} lawfirm=${lawfirm_id} msg=${result?.error}`);
      return new Response(
        JSON.stringify({ error: result?.error || 'No se pudo completar la compra', code }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PURCHASE SUCCESS] lead=${lead_id} lawfirm=${lawfirm_id} price=${result.price_paid}€ balance=${result.new_balance}€`);

    return new Response(
      JSON.stringify({
        success: true,
        purchase: {
          lead_id,
          price_paid: result.price_paid,
          new_balance: result.new_balance,
          is_commission: result.is_commission,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[purchase-lead] uncaught', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
