
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_lawfirm_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Create a lawfirm for the new user
  INSERT INTO public.lawfirms (name, contact_email, contact_person, status, is_active, leadsmarket_enabled)
  VALUES (
    'Despacho de ' || user_name,
    NEW.email,
    user_name,
    'active',
    true,
    true
  )
  RETURNING id INTO new_lawfirm_id;

  -- Create profile linked to the new lawfirm
  INSERT INTO public.profiles (id, email, full_name, lawfirm_id)
  VALUES (NEW.id, NEW.email, user_name, new_lawfirm_id);
  
  -- Default role to lawfirm_admin for self-registered users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'lawfirm_admin');
  
  RETURN NEW;
END;
$function$;
