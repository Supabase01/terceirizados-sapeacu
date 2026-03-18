-- Ajusta a unicidade de secretarias para o contexto multi-unidade
-- Remove a restrição global que impede o mesmo nome em unidades diferentes
ALTER TABLE public.secretarias
DROP CONSTRAINT IF EXISTS secretarias_nome_key;

-- Garante unicidade por unidade, ignorando diferenças simples de maiúsculas/minúsculas e espaços laterais
CREATE UNIQUE INDEX IF NOT EXISTS secretarias_unidade_nome_unique_idx
ON public.secretarias (unidade_id, lower(btrim(nome)))
WHERE unidade_id IS NOT NULL;