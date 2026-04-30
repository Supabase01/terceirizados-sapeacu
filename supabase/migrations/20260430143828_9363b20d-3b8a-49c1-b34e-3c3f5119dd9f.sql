ALTER TABLE public.adicionais
  ADD COLUMN IF NOT EXISTS quantidade numeric,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric;

ALTER TABLE public.descontos
  ADD COLUMN IF NOT EXISTS quantidade numeric,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric;

ALTER TABLE public.adicionais
  ADD CONSTRAINT chk_adicionais_qtd_pos CHECK (quantidade IS NULL OR quantidade >= 0),
  ADD CONSTRAINT chk_adicionais_vu_pos CHECK (valor_unitario IS NULL OR valor_unitario >= 0);

ALTER TABLE public.descontos
  ADD CONSTRAINT chk_descontos_qtd_pos CHECK (quantidade IS NULL OR quantidade >= 0),
  ADD CONSTRAINT chk_descontos_vu_pos CHECK (valor_unitario IS NULL OR valor_unitario >= 0);