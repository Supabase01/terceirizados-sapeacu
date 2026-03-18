
CREATE TABLE public.terceirizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  responsavel text,
  endereco text,
  cidade text,
  estado text DEFAULT 'BA',
  telefone text,
  email text,
  tipo text DEFAULT 'terceirizada',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.terceirizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to terceirizadas" ON public.terceirizadas FOR ALL TO public USING (true) WITH CHECK (true);
