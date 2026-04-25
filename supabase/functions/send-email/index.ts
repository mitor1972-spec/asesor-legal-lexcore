import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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
  assignment_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ===== AUTH =====
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  const token = authHeader.replace('Bearer ', '');
  const isServiceRole = token === supabaseServiceKey;

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: SendEmailRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { to, template_key, variables, lead_id, lawfirm_id, assignment_id } = payload;

  if (!to || !template_key) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, template_key' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Helper: log + update assignment delivery status
  async function recordResult(args: {
    status: 'sent' | 'failed';
    subject: string;
    error?: string | null;
  }) {
    const sentAt = new Date().toISOString();

    await supabase.from('email_log').insert({
      lead_id: lead_id || null,
      lawfirm_id: lawfirm_id || null,
      template_key,
      recipient_email: to,
      subject: args.subject,
      status: args.status,
      error_message: args.error || null,
      sent_at: sentAt,
    });

    if (assignment_id) {
      await supabase
        .from('lead_assignments')
        .update({ status_delivery: args.status })
        .eq('id', assignment_id);
    }
  }

  try {
    // ===== Get email settings =====
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .maybeSingle();

    if (settingsError) {
      console.error('Settings error:', settingsError);
    }

    if (!settings || !settings.is_configured || !settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      const msg = 'Email no configurado. Completa SMTP en Configuración > Email.';
      await recordResult({ status: 'failed', subject: '(no enviado)', error: msg });
      return new Response(
        JSON.stringify({ error: msg, status: 'failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ===== Get template =====
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', template_key)
      .maybeSingle();

    if (templateError || !template) {
      const msg = `Plantilla "${template_key}" no encontrada`;
      await recordResult({ status: 'failed', subject: '(plantilla no encontrada)', error: msg });
      return new Response(
        JSON.stringify({ error: msg, status: 'failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ===== Render =====
    let subject = template.subject || '';
    let body = template.body_html || '';
    for (const [key, value] of Object.entries(variables || {})) {
      const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(re, value ?? '');
      body = body.replace(re, value ?? '');
    }

    // ===== SMTP send =====
    const port = Number(settings.smtp_port) || 587;
    const security = (settings.smtp_security || 'starttls').toLowerCase(); // 'ssl' | 'starttls' | 'none'
    const useTls = security === 'ssl' || port === 465;

    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port,
        tls: useTls,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    const fromName = settings.sender_name || 'Asesor.Legal';
    const fromEmail = settings.sender_email || settings.smtp_user;

    try {
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        content: 'Este email requiere un cliente compatible con HTML.',
        html: body,
      });
    } finally {
      try { await client.close(); } catch (_) { /* ignore */ }
    }

    await recordResult({ status: 'sent', subject });

    return new Response(
      JSON.stringify({ success: true, status: 'sent', subject, to }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('send-email error:', message);
    await recordResult({ status: 'failed', subject: '(error de envío)', error: message });
    return new Response(
      JSON.stringify({ error: message, status: 'failed' }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
