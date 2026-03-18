
ALTER TABLE public.colaboradores 
  RENAME COLUMN salario_base TO salario_bruto;

ALTER TABLE public.colaboradores 
  ADD COLUMN encargo numeric NOT NULL DEFAULT 0,
  ADD COLUMN adicionais numeric NOT NULL DEFAULT 0,
  ADD COLUMN salario_liquido numeric NOT NULL DEFAULT 0;
