-- Fix: Allow lawfirm users to view attachments for their assigned leads
CREATE POLICY "Lawfirm users can view their lead attachments" 
ON public.lead_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM lead_assignments la
    JOIN profiles p ON p.lawfirm_id = la.lawfirm_id
    WHERE la.lead_id = lead_attachments.lead_id 
    AND p.id = auth.uid()
  )
);

-- Create table for CRM tracking activities
CREATE TABLE IF NOT EXISTS public.case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lawfirm_id UUID NOT NULL REFERENCES lawfirms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'reminder')),
  
  -- For calls
  call_duration_minutes INTEGER,
  call_result TEXT,
  
  -- For emails
  email_subject TEXT,
  email_direction TEXT CHECK (email_direction IN ('sent', 'received')),
  
  -- For tasks
  task_completed BOOLEAN DEFAULT false,
  task_due_date TIMESTAMPTZ,
  
  -- For reminders
  reminder_date TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Common
  title TEXT NOT NULL,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

-- Policies for case_activities
CREATE POLICY "Internal users can manage all activities" 
ON public.case_activities 
FOR ALL 
USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Lawfirm users can view their activities" 
ON public.case_activities 
FOR SELECT 
USING (lawfirm_id = public.get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can insert their activities" 
ON public.case_activities 
FOR INSERT 
WITH CHECK (lawfirm_id = public.get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can update their activities" 
ON public.case_activities 
FOR UPDATE 
USING (lawfirm_id = public.get_user_lawfirm_id(auth.uid()));

CREATE POLICY "Lawfirm users can delete their activities" 
ON public.case_activities 
FOR DELETE 
USING (lawfirm_id = public.get_user_lawfirm_id(auth.uid()));

-- Add result fields to lead_assignments
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (service_type IN ('consulta', 'procedimiento', 'juicio', 'acuerdo'));
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS lost_reason TEXT CHECK (lost_reason IN ('precio', 'eligio_otro', 'desistio', 'no_contactable', 'otro'));
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ;
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS next_action_description TEXT;
ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- Index for activities
CREATE INDEX IF NOT EXISTS idx_case_activities_lead ON case_activities(lead_id, lawfirm_id, created_at DESC);