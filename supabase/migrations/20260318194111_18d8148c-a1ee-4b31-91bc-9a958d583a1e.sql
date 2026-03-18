
ALTER TABLE public.adicionais ALTER COLUMN colaborador_id DROP NOT NULL;
ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'individual';
