
-- 1. Create system functions table (funções do sistema - not to confuse with payroll funcoes)
CREATE TABLE public.funcoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funcoes_sistema ENABLE ROW LEVEL SECURITY;

-- 2. Link users to system functions (many-to-many)
CREATE TABLE public.usuario_funcoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  funcao_sistema_id uuid REFERENCES public.funcoes_sistema(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, funcao_sistema_id)
);

ALTER TABLE public.usuario_funcoes_sistema ENABLE ROW LEVEL SECURITY;

-- 3. Route permissions for system functions
CREATE TABLE public.funcao_sistema_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcao_sistema_id uuid REFERENCES public.funcoes_sistema(id) ON DELETE CASCADE NOT NULL,
  route_path text NOT NULL,
  module_name text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  UNIQUE (funcao_sistema_id, route_path)
);

ALTER TABLE public.funcao_sistema_permissoes ENABLE ROW LEVEL SECURITY;

-- 4. RLS: authenticated can read, only admins can write
CREATE POLICY "Auth can read funcoes_sistema" ON public.funcoes_sistema
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage funcoes_sistema" ON public.funcoes_sistema
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth can read usuario_funcoes_sistema" ON public.usuario_funcoes_sistema
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage usuario_funcoes_sistema" ON public.usuario_funcoes_sistema
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth can read funcao_sistema_permissoes" ON public.funcao_sistema_permissoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage funcao_sistema_permissoes" ON public.funcao_sistema_permissoes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Function to check if user can access route (updated to include system functions)
CREATE OR REPLACE FUNCTION public.can_access_route(_user_id uuid, _route text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin can access everything
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
    OR
    -- Check old role-based permissions
    EXISTS (
      SELECT 1 FROM route_permissions rp
      JOIN user_roles ur ON ur.role = rp.role
      WHERE ur.user_id = _user_id AND rp.route_path = _route AND rp.allowed = true
    )
    OR
    -- Check new system function permissions
    EXISTS (
      SELECT 1 FROM funcao_sistema_permissoes fsp
      JOIN usuario_funcoes_sistema ufs ON ufs.funcao_sistema_id = fsp.funcao_sistema_id
      WHERE ufs.user_id = _user_id AND fsp.route_path = _route AND fsp.allowed = true
    )
$$;

-- 6. Function to get all allowed routes for a user (for sidebar filtering)
CREATE OR REPLACE FUNCTION public.get_user_allowed_routes(_user_id uuid)
RETURNS TABLE(route_path text, module_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If admin, return all known routes
  SELECT DISTINCT rp.route_path, rp.module_name
  FROM route_permissions rp
  WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
  
  UNION
  
  -- Role-based permissions
  SELECT DISTINCT rp.route_path, rp.module_name
  FROM route_permissions rp
  JOIN user_roles ur ON ur.role = rp.role
  WHERE ur.user_id = _user_id AND rp.allowed = true
  
  UNION
  
  -- System function permissions
  SELECT DISTINCT fsp.route_path, fsp.module_name
  FROM funcao_sistema_permissoes fsp
  JOIN usuario_funcoes_sistema ufs ON ufs.funcao_sistema_id = fsp.funcao_sistema_id
  WHERE ufs.user_id = _user_id AND fsp.allowed = true
$$;

-- 7. Ensure master admin trigger handles nailton specifically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  
  -- Master admin or first user
  IF NEW.email = 'nailton.alsampaio@gmail.com' OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  END IF;
  
  RETURN NEW;
END;
$$;
