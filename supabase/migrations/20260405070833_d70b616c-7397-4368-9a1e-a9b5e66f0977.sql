
-- Add registration-related columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bar_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bar_association text;

-- Add registration-related columns to lawfirms
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS interested_in_advertising boolean DEFAULT false;
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS interested_in_services_sales boolean DEFAULT false;
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'quick';
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS num_lawyers text;
ALTER TABLE public.lawfirms ADD COLUMN IF NOT EXISTS referral_source text;
