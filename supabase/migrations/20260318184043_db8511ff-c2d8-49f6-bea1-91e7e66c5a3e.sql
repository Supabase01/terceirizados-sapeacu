
-- Add unidade_id to isolated tables
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.secretarias ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.funcoes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.lotacoes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.liderancas ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.folha_processamento ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);
ALTER TABLE public.descontos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades_folha(id);

-- Master check function
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND email = 'nailton.alsampaio@gmail.com'
  )
$$;

-- User has access to unidade function
CREATE OR REPLACE FUNCTION public.user_has_unidade_access(_user_id uuid, _unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_master(_user_id)
    OR public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.usuario_unidades
      WHERE user_id = _user_id AND unidade_id = _unidade_id
    )
$$;
