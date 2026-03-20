
-- Add data_nascimento column
ALTER TABLE public.colaboradores ADD COLUMN data_nascimento date NULL;

-- Populate missing matriculas per unidade
WITH numbered AS (
  SELECT id, unidade_id,
    ROW_NUMBER() OVER (PARTITION BY unidade_id ORDER BY created_at) + COALESCE(
      (SELECT MAX(CASE WHEN c2.matricula ~ '^\d+$' THEN c2.matricula::integer ELSE 0 END)
       FROM colaboradores c2 WHERE c2.unidade_id = colaboradores.unidade_id AND c2.matricula IS NOT NULL AND c2.matricula != ''),
      0
    ) as new_num
  FROM colaboradores
  WHERE matricula IS NULL OR matricula = ''
)
UPDATE colaboradores
SET matricula = LPAD(numbered.new_num::text, 4, '0')
FROM numbered
WHERE colaboradores.id = numbered.id;

-- Add unique constraint to prevent duplicate matriculas per unidade
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colaboradores_unidade_matricula_unique') THEN
    ALTER TABLE public.colaboradores ADD CONSTRAINT colaboradores_unidade_matricula_unique UNIQUE (unidade_id, matricula);
  END IF;
END $$;
