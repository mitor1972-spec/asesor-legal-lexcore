-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'lawfirm_admin', 'lawfirm_manager', 'lawfirm_lawyer');

-- Create enum for theme preference
CREATE TYPE public.theme_pref AS ENUM ('light', 'dark', 'system');

-- Create enum for source channels
CREATE TYPE public.source_channel AS ENUM ('Teléfono', 'Web chat', 'WhatsApp', 'Email');

-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM ('Pendiente', 'Derivado', 'Facturado', 'Cerrado');

-- Create enum for delivery status
CREATE TYPE public.delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- Create enum for lawfirm status
CREATE TYPE public.lawfirm_status AS ENUM ('active', 'inactive');

-- Create enum for attachment context
CREATE TYPE public.attachment_context AS ENUM ('initial', 'update');

-- Despachos (stub mínimo)
CREATE TABLE public.lawfirms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_derivations TEXT,
  status lawfirm_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sucursales/Delegaciones (stub mínimo)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawfirm_id UUID REFERENCES public.lawfirms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  province TEXT,
  email_derivations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  lawfirm_id UUID REFERENCES public.lawfirms(id),
  branch_id UUID REFERENCES public.branches(id),
  theme_pref theme_pref DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES public.profiles(id),
  source_channel source_channel DEFAULT 'Web chat',
  lead_text TEXT NOT NULL,
  structured_fields JSONB DEFAULT '{}',
  status_internal lead_status DEFAULT 'Pendiente',
  score_final INTEGER,
  price_final INTEGER,
  archived_at TIMESTAMPTZ
);

-- Lead attachments
CREATE TABLE public.lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  attachment_context attachment_context DEFAULT 'initial'
);

-- Lead assignments
CREATE TABLE public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  lawfirm_id UUID REFERENCES public.lawfirms(id),
  branch_id UUID REFERENCES public.branches(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by_user_id UUID REFERENCES public.profiles(id),
  status_delivery delivery_status DEFAULT 'pending'
);

-- Lead history for tracking changes
CREATE TABLE public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_status ON public.leads(status_internal);
CREATE INDEX idx_leads_created_by ON public.leads(created_by_user_id);
CREATE INDEX idx_lead_history_lead_id ON public.lead_history(lead_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawfirms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is internal (admin or operator)
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'operator')
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Internal users can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles (read-only for users, admin can manage)
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Internal users can view all leads"
  ON public.leads FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can update leads"
  ON public.leads FOR UPDATE
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can delete leads"
  ON public.leads FOR DELETE
  USING (public.is_internal_user(auth.uid()));

-- RLS Policies for lead_attachments
CREATE POLICY "Internal users can view all attachments"
  ON public.lead_attachments FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert attachments"
  ON public.lead_attachments FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can delete attachments"
  ON public.lead_attachments FOR DELETE
  USING (public.is_internal_user(auth.uid()));

-- RLS Policies for lawfirms
CREATE POLICY "Internal users can view lawfirms"
  ON public.lawfirms FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Admins can manage lawfirms"
  ON public.lawfirms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for branches
CREATE POLICY "Internal users can view branches"
  ON public.branches FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Admins can manage branches"
  ON public.branches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lead_assignments
CREATE POLICY "Internal users can view assignments"
  ON public.lead_assignments FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can manage assignments"
  ON public.lead_assignments FOR ALL
  USING (public.is_internal_user(auth.uid()));

-- RLS Policies for lead_history
CREATE POLICY "Internal users can view history"
  ON public.lead_history FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert history"
  ON public.lead_history FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));

-- Trigger to update updated_at on leads
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Default role to operator for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();