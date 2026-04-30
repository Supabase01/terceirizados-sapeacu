ALTER TABLE public.frequencias 
  ADD COLUMN IF NOT EXISTS faltas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_faltas numeric NOT NULL DEFAULT 0;

ALTER TABLE public.frequencias
  ADD CONSTRAINT frequencias_faltas_range CHECK (faltas >= 0 AND faltas <= 31);