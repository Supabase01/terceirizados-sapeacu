-- Function to generate the next matricula for a given unidade
CREATE OR REPLACE FUNCTION public.next_matricula(_unidade_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_num integer;
  _next text;
BEGIN
  -- Extract numeric part from existing matriculas in this unidade
  SELECT COALESCE(MAX(
    CASE 
      WHEN matricula ~ '^\d+$' THEN matricula::integer
      ELSE 0
    END
  ), 0)
  INTO _max_num
  FROM public.colaboradores
  WHERE unidade_id = _unidade_id
    AND matricula IS NOT NULL
    AND matricula != '';

  _next := LPAD((_max_num + 1)::text, 4, '0');
  RETURN _next;
END;
$$;

-- Unique constraint: matricula per unidade (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_unidade_matricula_unique_idx
ON public.colaboradores (unidade_id, matricula)
WHERE matricula IS NOT NULL AND matricula != '';