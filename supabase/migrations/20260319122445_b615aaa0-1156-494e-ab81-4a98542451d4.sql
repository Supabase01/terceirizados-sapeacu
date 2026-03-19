
-- Fix 1: cidades - remove public ALL, add authenticated read + admin write
DROP POLICY IF EXISTS "Allow all access to cidades" ON public.cidades;

CREATE POLICY "Authenticated read cidades"
  ON public.cidades FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage cidades"
  ON public.cidades FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_master(auth.uid()));

-- Fix 2: profiles - restrict SELECT to own row + admin
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_master(auth.uid()));

-- Fix 3: audit_log - remove INSERT policy for authenticated
DROP POLICY IF EXISTS "System can insert audit_log" ON public.audit_log;
