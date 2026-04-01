
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Default role to lawfirm_admin for self-registered users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'lawfirm_admin');
  
  RETURN NEW;
END;
$function$;
