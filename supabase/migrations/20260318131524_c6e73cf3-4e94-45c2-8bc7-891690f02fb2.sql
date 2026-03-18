ALTER TABLE public.profiles ADD COLUMN pin text DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.validate_user_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND pin = _pin
  );
$$;

CREATE OR REPLACE FUNCTION public.set_user_pin(_user_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET pin = _pin WHERE id = _user_id;
END;
$$;