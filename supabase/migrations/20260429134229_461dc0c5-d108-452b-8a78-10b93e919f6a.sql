ALTER TABLE public.adicionais
  ADD COLUMN IF NOT EXISTS modo_calculo text NOT NULL DEFAULT 'fixo',
  ADD COLUMN IF NOT EXISTS percentual numeric,
  ADD COLUMN IF NOT EXISTS base_calculo text;

ALTER TABLE public.descontos
  ADD COLUMN IF NOT EXISTS modo_calculo text NOT NULL DEFAULT 'fixo',
  ADD COLUMN IF NOT EXISTS percentual numeric,
  ADD COLUMN IF NOT EXISTS base_calculo text;