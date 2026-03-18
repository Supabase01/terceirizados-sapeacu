
-- Per-user route permission overrides
CREATE TABLE public.usuario_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_path text NOT NULL,
  module_name text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, route_path)
);

ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage usuario_permissoes" ON public.usuario_permissoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own usuario_permissoes" ON public.usuario_permissoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Update get_user_allowed_routes to include user-level overrides
CREATE OR REPLACE FUNCTION public.get_user_allowed_routes(_user_id uuid)
 RETURNS TABLE(route_path text, module_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- Compute base allowed routes (admin gets all, plus role + function permissions)
  WITH base_routes AS (
    -- Admin gets all
    SELECT DISTINCT rp.route_path, rp.module_name
    FROM route_permissions rp
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
    
    UNION
    
    -- Role-based
    SELECT DISTINCT rp.route_path, rp.module_name
    FROM route_permissions rp
    JOIN user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.allowed = true
    
    UNION
    
    -- Function-based
    SELECT DISTINCT fsp.route_path, fsp.module_name
    FROM funcao_sistema_permissoes fsp
    JOIN usuario_funcoes_sistema ufs ON ufs.funcao_sistema_id = fsp.funcao_sistema_id
    WHERE ufs.user_id = _user_id AND fsp.allowed = true
  ),
  -- User-level explicit allows (adds routes not in base)
  user_allows AS (
    SELECT up.route_path, up.module_name
    FROM usuario_permissoes up
    WHERE up.user_id = _user_id AND up.allowed = true
  ),
  -- User-level explicit blocks
  user_blocks AS (
    SELECT up.route_path
    FROM usuario_permissoes up
    WHERE up.user_id = _user_id AND up.allowed = false
  )
  -- Base routes minus blocks, plus explicit allows
  SELECT r.route_path, r.module_name FROM base_routes r
  WHERE r.route_path NOT IN (SELECT ub.route_path FROM user_blocks ub)
  UNION
  SELECT ua.route_path, ua.module_name FROM user_allows ua;
$$;

-- Update can_access_route to include user-level overrides
CREATE OR REPLACE FUNCTION public.can_access_route(_user_id uuid, _route text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    -- If user has explicit block, deny (unless also explicitly allowed at user level)
    CASE
      WHEN EXISTS (SELECT 1 FROM usuario_permissoes WHERE user_id = _user_id AND route_path = _route AND allowed = false) THEN false
      WHEN EXISTS (SELECT 1 FROM usuario_permissoes WHERE user_id = _user_id AND route_path = _route AND allowed = true) THEN true
      ELSE
        -- Fallback to existing logic
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
        OR EXISTS (
          SELECT 1 FROM route_permissions rp
          JOIN user_roles ur ON ur.role = rp.role
          WHERE ur.user_id = _user_id AND rp.route_path = _route AND rp.allowed = true
        )
        OR EXISTS (
          SELECT 1 FROM funcao_sistema_permissoes fsp
          JOIN usuario_funcoes_sistema ufs ON ufs.funcao_sistema_id = fsp.funcao_sistema_id
          WHERE ufs.user_id = _user_id AND fsp.route_path = _route AND fsp.allowed = true
        )
    END
$$;
