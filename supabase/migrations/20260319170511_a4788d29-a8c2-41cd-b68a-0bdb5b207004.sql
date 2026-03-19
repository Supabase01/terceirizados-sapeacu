
-- 1. Add padrao column to unidades_folha
ALTER TABLE public.unidades_folha ADD COLUMN padrao text NOT NULL DEFAULT 'padrao_01';

-- 2. Create encargos table
CREATE TABLE public.encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  percentual numeric NOT NULL DEFAULT 0,
  escopo text NOT NULL DEFAULT 'global',
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades_folha(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.encargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read encargos of their units"
  ON public.encargos FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users insert encargos in their units"
  ON public.encargos FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users update encargos in their units"
  ON public.encargos FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users delete encargos in their units"
  ON public.encargos FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- 3. Add total_encargos to folha_processamento
ALTER TABLE public.folha_processamento ADD COLUMN total_encargos numeric NOT NULL DEFAULT 0;

-- 4. Add route permissions for /cadastro/encargos
INSERT INTO public.route_permissions (role, route_path, module_name, allowed)
VALUES
  ('admin', '/cadastro/encargos', 'Cadastros', true),
  ('usuario', '/cadastro/encargos', 'Cadastros', true);
