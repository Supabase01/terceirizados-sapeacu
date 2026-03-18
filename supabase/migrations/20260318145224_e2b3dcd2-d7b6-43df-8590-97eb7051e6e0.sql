
-- 1. Update colaboradores: add new fields, remove old financial columns
ALTER TABLE public.colaboradores 
  ADD COLUMN IF NOT EXISTS beneficio_social boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS pix text;

ALTER TABLE public.colaboradores 
  DROP COLUMN IF EXISTS encargo,
  DROP COLUMN IF EXISTS adicionais,
  DROP COLUMN IF EXISTS salario_liquido;

-- Rename salario_bruto to salario_base for clarity
ALTER TABLE public.colaboradores RENAME COLUMN salario_bruto TO salario_base;

-- 2. Create adicionais table (fixos + eventuais)
CREATE TABLE public.adicionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'fixo', -- 'fixo' or 'eventual'
  mes integer, -- null for fixos (recorrente), set for eventuais
  ano integer, -- null for fixos (recorrente), set for eventuais
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to adicionais"
  ON public.adicionais FOR ALL TO public
  USING (true) WITH CHECK (true);

-- 3. Create descontos table (global or individual)
CREATE TABLE public.descontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE, -- null = global
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  is_percentual boolean NOT NULL DEFAULT false, -- true = %, false = R$
  escopo text NOT NULL DEFAULT 'individual', -- 'global' or 'individual'
  mes integer, -- null = recorrente
  ano integer, -- null = recorrente
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.descontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to descontos"
  ON public.descontos FOR ALL TO public
  USING (true) WITH CHECK (true);
