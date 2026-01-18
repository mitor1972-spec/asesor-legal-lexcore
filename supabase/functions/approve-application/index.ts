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

    // Verify admin user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden aprobar solicitudes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { application_id } = await req.json();

    if (!application_id) {
      return new Response(
        JSON.stringify({ error: 'ID de solicitud requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get application
    const { data: application, error: appError } = await supabaseAdmin
      .from('lawfirm_applications')
      .select('*')
      .eq('id', application_id)
      .eq('status', 'pending')
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: 'Solicitud no encontrada o ya procesada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Create the lawfirm
    const { data: newLawfirm, error: lawfirmError } = await supabaseAdmin
      .from('lawfirms')
      .insert({
        name: application.name,
        cif: application.cif,
        phone: application.phone,
        contact_email: application.email,
        website: application.website,
        address: application.address,
        city: application.city,
        province: application.province,
        postal_code: application.postal_code,
        contact_person: application.contact_name,
        areas_accepted: application.areas_selected,
        provinces_accepted: application.all_spain ? null : application.provinces_selected,
        monthly_capacity: application.monthly_capacity,
        max_lead_price: application.max_price_per_lead,
        min_lead_score: application.min_score,
        is_active: true,
        status: 'active',
        marketplace_balance: 0,
        marketplace_alerts_enabled: true,
      })
      .select()
      .single();

    if (lawfirmError) {
      console.error('Error creating lawfirm:', lawfirmError);
      return new Response(
        JSON.stringify({ error: 'Error al crear el despacho' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create user for the contact person
    const tempPassword = generatePassword();
    
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: application.contact_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: application.contact_name,
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      // Rollback lawfirm creation
      await supabaseAdmin.from('lawfirms').delete().eq('id', newLawfirm.id);
      
      if (createUserError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'El email ya está registrado en el sistema' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al crear el usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Update profile with lawfirm_id
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: application.contact_name,
        lawfirm_id: newLawfirm.id,
        is_active: true,
      })
      .eq('id', newUser.user.id);

    // 4. Update user role to lawfirm_admin
    await supabaseAdmin
      .from('user_roles')
      .update({ role: 'lawfirm_admin' })
      .eq('user_id', newUser.user.id);

    // 5. Update application status
    await supabaseAdmin
      .from('lawfirm_applications')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        lawfirm_id: newLawfirm.id,
      })
      .eq('id', application_id);

    // 6. Send welcome email (using email settings if configured)
    try {
      await sendWelcomeEmail(supabaseAdmin, {
        to: application.contact_email,
        name: application.contact_name,
        lawfirmName: application.name,
        password: tempPassword,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the whole operation if email fails
    }

    console.log(`Application ${application_id} approved. Lawfirm ${newLawfirm.id} and user ${newUser.user.id} created.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        lawfirm_id: newLawfirm.id,
        user_id: newUser.user.id,
        message: 'Despacho creado correctamente',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in approve-application function:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendWelcomeEmail(
  supabase: ReturnType<typeof createClient>,
  params: { to: string; name: string; lawfirmName: string; password: string }
) {
  // Get email settings
  const { data: emailSettings } = await supabase
    .from('email_settings')
    .select('*')
    .eq('is_configured', true)
    .single();

  if (!emailSettings) {
    console.log('Email not configured, skipping welcome email');
    return;
  }

  // For now, log the email that should be sent
  // In production, this would call the send-email edge function or use Resend directly
  console.log('Would send welcome email:', {
    to: params.to,
    subject: `¡Bienvenido a Asesor.Legal, ${params.lawfirmName}!`,
    body: `
      Hola ${params.name},
      
      Tu solicitud de alta ha sido aprobada.
      
      Datos de acceso:
      - Email: ${params.to}
      - Contraseña temporal: ${params.password}
      
      Por favor, cambia tu contraseña después de iniciar sesión.
      
      Accede a tu portal: https://asesor-legal-lexcore.lovable.app/login
      
      ¡Bienvenido!
      Equipo de Asesor.Legal
    `,
  });
}
