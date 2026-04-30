-- Adicionais
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_valor_pos CHECK (valor >= 0);
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_pct_range CHECK (percentual IS NULL OR (percentual > 0 AND percentual <= 100));
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_individual_tem_colab 
  CHECK (escopo <> 'individual' OR colaborador_id IS NOT NULL);
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_vigencia_inicio
  CHECK ((mes IS NULL AND ano IS NULL) OR (mes IS NOT NULL AND ano IS NOT NULL));
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_vigencia_fim
  CHECK ((mes_fim IS NULL AND ano_fim IS NULL) OR (mes_fim IS NOT NULL AND ano_fim IS NOT NULL));
ALTER TABLE public.adicionais ADD CONSTRAINT chk_adicionais_mes_range
  CHECK ((mes IS NULL OR (mes >= 1 AND mes <= 12)) AND (mes_fim IS NULL OR (mes_fim >= 1 AND mes_fim <= 12)));

-- Descontos
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_valor_pos CHECK (valor >= 0);
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_pct_range CHECK (percentual IS NULL OR (percentual > 0 AND percentual <= 100));
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_individual_tem_colab 
  CHECK (escopo <> 'individual' OR colaborador_id IS NOT NULL);
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_vigencia
  CHECK ((mes IS NULL AND ano IS NULL) OR (mes IS NOT NULL AND ano IS NOT NULL));
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_mes_range
  CHECK (mes IS NULL OR (mes >= 1 AND mes <= 12));
ALTER TABLE public.descontos ADD CONSTRAINT chk_descontos_base_nao_liquido 
  CHECK (base_calculo IS NULL OR base_calculo IN ('salario_base','bruto'));