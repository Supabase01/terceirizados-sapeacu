
-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create route_permissions table
CREATE TABLE public.route_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  route_path text NOT NULL,
  module_name text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  UNIQUE (role, route_path)
);

ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Function to get user roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- 6. Function to check route access
CREATE OR REPLACE FUNCTION public.can_access_route(_user_id uuid, _route text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.route_permissions rp
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.route_path = _route
      AND rp.allowed = true
  )
$$;

-- 7. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- 9. RLS policies for user_roles (only admins can manage)
CREATE POLICY "Authenticated can read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. RLS policies for route_permissions
CREATE POLICY "Authenticated can read permissions" ON public.route_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage permissions" ON public.route_permissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Insert default permissions for admin (all routes)
INSERT INTO public.route_permissions (role, route_path, module_name) VALUES
  ('admin', '/admin/config', 'Administrador'),
  ('admin', '/indicadores', 'Folha de Pagamentos'),
  ('admin', '/import', 'Folha de Pagamentos'),
  ('admin', '/relatorios', 'Folha de Pagamentos'),
  ('admin', '/cadastro/colaboradores', 'Cadastros'),
  ('admin', '/cadastro/secretarias', 'Cadastros'),
  ('admin', '/cadastro/funcoes', 'Cadastros'),
  ('admin', '/cadastro/lotacoes', 'Cadastros'),
  ('admin', '/alertas', 'Auditoria');

-- Default permissions for usuario (no admin, no import)
INSERT INTO public.route_permissions (role, route_path, module_name) VALUES
  ('usuario', '/indicadores', 'Folha de Pagamentos'),
  ('usuario', '/relatorios', 'Folha de Pagamentos'),
  ('usuario', '/cadastro/colaboradores', 'Cadastros'),
  ('usuario', '/cadastro/secretarias', 'Cadastros'),
  ('usuario', '/cadastro/funcoes', 'Cadastros'),
  ('usuario', '/cadastro/lotacoes', 'Cadastros'),
  ('usuario', '/alertas', 'Auditoria');
