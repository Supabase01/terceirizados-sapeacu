-- ============= ADICIONAIS: Backfill de tipo conforme dados existentes =============
UPDATE public.adicionais
SET tipo = CASE
  WHEN mes IS NOT NULL AND mes_fim IS NOT NULL THEN 'prazo'
  WHEN mes IS NOT NULL AND mes_fim IS NULL     THEN 'eventual'
  ELSE 'recorrente'
END;

ALTER TABLE public.adicionais DROP CONSTRAINT IF EXISTS chk_adicionais_individual_tem_colab;
ALTER TABLE public.adicionais DROP CONSTRAINT IF EXISTS chk_adicionais_escopo;
ALTER TABLE public.adicionais DROP CONSTRAINT IF EXISTS chk_adicionais_escopo_colab;
ALTER TABLE public.adicionais DROP CONSTRAINT IF EXISTS chk_adicionais_tipo;
ALTER TABLE public.adicionais DROP CONSTRAINT IF EXISTS chk_adicionais_vigencia_por_tipo;

ALTER TABLE public.adicionais
  ADD CONSTRAINT chk_adicionais_escopo
  CHECK (escopo IN ('global','grupo','individual'));

ALTER TABLE public.adicionais
  ADD CONSTRAINT chk_adicionais_escopo_colab
  CHECK (
    (escopo IN ('individual','grupo') AND colaborador_id IS NOT NULL)
    OR (escopo = 'global' AND colaborador_id IS NULL)
  );

ALTER TABLE public.adicionais
  ADD CONSTRAINT chk_adicionais_tipo
  CHECK (tipo IN ('recorrente','prazo','eventual'));

ALTER TABLE public.adicionais
  ADD CONSTRAINT chk_adicionais_vigencia_por_tipo
  CHECK (
    (tipo = 'recorrente' AND mes IS NULL AND ano IS NULL AND mes_fim IS NULL AND ano_fim IS NULL)
    OR (tipo = 'eventual' AND mes IS NOT NULL AND ano IS NOT NULL AND mes_fim IS NULL AND ano_fim IS NULL)
    OR (tipo = 'prazo'    AND mes IS NOT NULL AND ano IS NOT NULL AND mes_fim IS NOT NULL AND ano_fim IS NOT NULL
        AND (ano_fim*100 + mes_fim) >= (ano*100 + mes))
  );

-- ============= DESCONTOS =============
ALTER TABLE public.descontos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS mes_fim integer,
  ADD COLUMN IF NOT EXISTS ano_fim integer;

UPDATE public.descontos
SET tipo = CASE
  WHEN mes IS NOT NULL AND ano IS NOT NULL THEN 'eventual'
  ELSE 'recorrente'
END;

ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_individual_tem_colab;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_vigencia;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_escopo;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_escopo_colab;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_tipo;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_mes_fim_range;
ALTER TABLE public.descontos DROP CONSTRAINT IF EXISTS chk_descontos_vigencia_por_tipo;

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_escopo
  CHECK (escopo IN ('global','grupo','individual'));

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_escopo_colab
  CHECK (
    (escopo IN ('individual','grupo') AND colaborador_id IS NOT NULL)
    OR (escopo = 'global' AND colaborador_id IS NULL)
  );

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_tipo
  CHECK (tipo IN ('recorrente','prazo','eventual'));

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_mes_fim_range
  CHECK (mes_fim IS NULL OR (mes_fim BETWEEN 1 AND 12));

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_vigencia_por_tipo
  CHECK (
    (tipo = 'recorrente' AND mes IS NULL AND ano IS NULL AND mes_fim IS NULL AND ano_fim IS NULL)
    OR (tipo = 'eventual' AND mes IS NOT NULL AND ano IS NOT NULL AND mes_fim IS NULL AND ano_fim IS NULL)
    OR (tipo = 'prazo'    AND mes IS NOT NULL AND ano IS NOT NULL AND mes_fim IS NOT NULL AND ano_fim IS NOT NULL
        AND (ano_fim*100 + mes_fim) >= (ano*100 + mes))
  );

DELETE FROM public.adicionais WHERE escopo = 'individual' AND colaborador_id IS NULL;
DELETE FROM public.descontos  WHERE escopo = 'individual' AND colaborador_id IS NULL;