import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is admin or lawfirm_admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check requesting user's role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    const requestingRole = roleData?.role;
    
    // Get request body
    const { email, password, full_name, role, lawfirm_id } = await req.json();

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization checks based on requesting user's role
    if (requestingRole === 'admin') {
      // Admin can create any user
    } else if (requestingRole === 'lawfirm_admin') {
      // Lawfirm admin can only create lawfirm users
      if (!['lawfirm_admin', 'lawfirm_manager', 'lawfirm_lawyer'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'No tienes permisos para crear este tipo de usuario' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check that the lawfirm_admin is creating users for their own lawfirm
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('lawfirm_id')
        .eq('id', requestingUser.id)
        .single();

      if (lawfirm_id && adminProfile?.lawfirm_id !== lawfirm_id) {
        return new Response(
          JSON.stringify({ error: 'Solo puedes crear usuarios para tu propio despacho' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para crear usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Handle specific error cases
      if (createError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email ya está registrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // Update profile with additional data
    const profileUpdate: Record<string, unknown> = {
      full_name,
      is_active: true,
    };

    if (lawfirm_id) {
      profileUpdate.lawfirm_id = lawfirm_id;
    } else if (requestingRole === 'lawfirm_admin') {
      // If lawfirm_admin creates a user without specifying lawfirm, use their lawfirm
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('lawfirm_id')
        .eq('id', requestingUser.id)
        .single();
      
      if (adminProfile?.lawfirm_id) {
        profileUpdate.lawfirm_id = adminProfile.lawfirm_id;
      }
    }

    await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    // Update the user's role (the trigger already creates operator role, so we update it)
    await supabaseAdmin
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: newUser.user.email,
          full_name 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
