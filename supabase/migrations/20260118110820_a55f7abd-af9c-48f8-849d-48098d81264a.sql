-- Email settings table
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_security TEXT DEFAULT 'tls' CHECK (smtp_security IN ('tls', 'ssl', 'none')),
  smtp_user TEXT,
  smtp_password TEXT,
  sender_email TEXT,
  sender_name TEXT DEFAULT 'Asesor.Legal',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO public.email_templates (template_key, subject, body_html, variables) VALUES
(
  'lead_derivation',
  'Nuevo caso derivado: {{area_legal}} - {{nombre_cliente}}',
  '<h2>Nuevo caso para tu despacho</h2>
   <p>Buenos días,</p>
   <p>Por medio del presente les compartimos ficha resumen de un ''posible'' cliente para su tratamiento.</p>
   <p>Se te ha derivado un nuevo caso de <strong>{{area_legal}}</strong>.</p>
   <h3>Datos del cliente</h3>
   <ul>
     <li><strong>Nombre:</strong> {{nombre_cliente}}</li>
     <li><strong>Teléfono:</strong> {{telefono}}</li>
     <li><strong>Email:</strong> {{email}}</li>
     <li><strong>Ubicación:</strong> {{ciudad}}, {{provincia}}</li>
   </ul>
   <h3>Resumen del caso</h3>
   {{resumen_caso}}
   <p><a href="{{link_caso}}">Ver caso completo en el portal</a></p>
   <hr>
   <p>Lexcore™ by Asesor.Legal</p>',
  ARRAY['nombre_cliente', 'telefono', 'email', 'ciudad', 'provincia', 'area_legal', 'resumen_caso', 'link_caso']
),
(
  'new_case_notification',
  '📥 Tienes un nuevo caso pendiente',
  '<h2>¡Nuevo caso recibido!</h2>
   <p>Has recibido un nuevo caso de <strong>{{area_legal}}</strong>.</p>
   <p>Score: <strong>{{score}}/100</strong> | Precio: <strong>{{precio}}€</strong></p>
   <p><a href="{{link_caso}}">Acceder al caso</a></p>',
  ARRAY['area_legal', 'score', 'precio', 'link_caso']
) ON CONFLICT (template_key) DO NOTHING;

-- Email log table
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE SET NULL,
  template_key TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice notes table
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lawfirm_id UUID REFERENCES lawfirms(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription TEXT,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  company_name TEXT DEFAULT 'Asesor.Legal',
  legal_name TEXT,
  cif TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  primary_color TEXT DEFAULT '#0d9488',
  secondary_color TEXT DEFAULT '#1e293b',
  timezone TEXT DEFAULT 'Europe/Madrid',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  currency TEXT DEFAULT 'EUR',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default company settings
INSERT INTO public.company_settings (company_name) VALUES ('Asesor.Legal')
ON CONFLICT DO NOTHING;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_lead ON voice_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_lead ON email_log(lead_id, created_at DESC);

-- Add missing columns to lawfirms if not exists
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS payment_model TEXT DEFAULT 'postpago' CHECK (payment_model IN ('prepago', 'postpago', 'paquete'));
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS initial_credit DECIMAL DEFAULT 0;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS discount_percent DECIMAL DEFAULT 0;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS commercial_notes TEXT;
ALTER TABLE lawfirms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Enable RLS on new tables
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings (admin only)
CREATE POLICY "Admins can manage email settings" ON public.email_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for email_templates (admin only)
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for email_log (internal users can view)
CREATE POLICY "Internal users can view email log" ON public.email_log
  FOR SELECT USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert email log" ON public.email_log
  FOR INSERT WITH CHECK (public.is_internal_user(auth.uid()));

-- RLS Policies for voice_notes
CREATE POLICY "Users can view their own voice notes" ON public.voice_notes
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.is_internal_user(auth.uid()) OR
    (lawfirm_id IS NOT NULL AND lawfirm_id = public.get_user_lawfirm_id(auth.uid()))
  );

CREATE POLICY "Users can insert their own voice notes" ON public.voice_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own voice notes" ON public.voice_notes
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for company_settings (admin only)
CREATE POLICY "Admins can manage company settings" ON public.company_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Internal users can view company settings" ON public.company_settings
  FOR SELECT USING (public.is_internal_user(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice-notes bucket
CREATE POLICY "Users can upload their own voice notes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-notes' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view voice notes they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-notes' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own voice notes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-notes' AND
    auth.uid() IS NOT NULL
  );

-- Storage policies for logos bucket
CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND
    public.has_role(auth.uid(), 'admin')
  );