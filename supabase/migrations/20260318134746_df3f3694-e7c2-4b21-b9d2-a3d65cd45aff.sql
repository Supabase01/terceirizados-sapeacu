
CREATE TABLE public.prefeituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  endereco text,
  cidade text,
  estado text DEFAULT 'BA',
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prefeituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to prefeituras" ON public.prefeituras FOR ALL TO public USING (true) WITH CHECK (true);
