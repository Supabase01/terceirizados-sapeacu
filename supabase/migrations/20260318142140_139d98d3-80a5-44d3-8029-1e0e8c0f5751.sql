
-- Create both tables first
CREATE TABLE public.unidades_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instituicao_id uuid,
  instituicao_tipo text NOT NULL DEFAULT 'prefeitura',
  cidade text,
  estado text DEFAULT 'BA',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unidades_folha ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usuario_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unidade_id uuid NOT NULL REFERENCES public.unidades_folha(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, unidade_id)
);

ALTER TABLE public.usuario_unidades ENABLE ROW LEVEL SECURITY;

-- Now add policies (usuario_unidades exists)
CREATE POLICY "Users read own units"
  ON public.unidades_folha FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.usuario_unidades uu WHERE uu.unidade_id = id AND uu.user_id = auth.uid())
  );

CREATE POLICY "Admins manage unidades"
  ON public.unidades_folha FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage usuario_unidades"
  ON public.usuario_unidades FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own links"
  ON public.usuario_unidades FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
