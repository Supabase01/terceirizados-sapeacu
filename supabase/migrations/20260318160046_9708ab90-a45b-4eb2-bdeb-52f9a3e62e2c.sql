
CREATE TABLE public.folha_processamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  cpf text NOT NULL,
  funcao text,
  secretaria text,
  lotacao text,
  salario_base numeric NOT NULL DEFAULT 0,
  total_adicionais numeric NOT NULL DEFAULT 0,
  total_descontos numeric NOT NULL DEFAULT 0,
  bruto numeric NOT NULL DEFAULT 0,
  liquido numeric NOT NULL DEFAULT 0,
  mes integer NOT NULL,
  ano integer NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, mes, ano)
);

ALTER TABLE public.folha_processamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access folha_processamento" ON public.folha_processamento
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
