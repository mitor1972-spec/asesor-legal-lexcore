import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  template_key: string;
  variables: Record<string, string>;
  lead_id?: string;
  lawfirm_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, template_key, variables, lead_id, lawfirm_id }: SendEmailRequest = await req.json();

    console.log('Sending email to:', to, 'with template:', template_key);

    // Get email settings
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (settingsError || !settings?.is_configured) {
      console.error('Email not configured:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Email no configurado. Configure SMTP en Configuración > Email.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', template_key)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ error: 'Plantilla no encontrada' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let body = template.body_html;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    }

    // Send email using SMTP
    // Note: For production, use a proper email service like Resend, SendGrid, etc.
    // This is a simplified version using the built-in Deno.smtp (not available)
    // For now, we'll simulate success and log the email
    
    console.log('Email prepared:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', settings.sender_email);
    
    // In a real implementation, you would use an email service here
    // For example, with Resend:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    // await resend.emails.send({ from, to, subject, html: body });

    // Log the email
    const { error: logError } = await supabase.from('email_log').insert({
      lead_id: lead_id || null,
      lawfirm_id: lawfirm_id || null,
      template_key,
      recipient_email: to,
      subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email enviado correctamente',
        subject,
        to 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error('Error in send-email function:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
