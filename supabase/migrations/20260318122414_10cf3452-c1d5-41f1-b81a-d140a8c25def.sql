
-- Auto-assign admin role to first user if no admins exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  
  -- Check if any admin exists
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  
  -- If no admin exists, make this user admin; otherwise assign usuario role
  IF NOT admin_exists THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  END IF;
  
  RETURN NEW;
END;
$$;
