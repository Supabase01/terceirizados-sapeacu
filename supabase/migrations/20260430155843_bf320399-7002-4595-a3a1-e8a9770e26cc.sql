-- Função utilitária para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tabela de controle de frequência mensal por colaborador
CREATE TABLE public.frequencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL,
  unidade_id uuid NOT NULL,
  mes integer NOT NULL,
  ano integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_entrega date,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (colaborador_id, mes, ano)
);

CREATE INDEX idx_frequencias_unidade_periodo ON public.frequencias(unidade_id, ano, mes);
CREATE INDEX idx_frequencias_colaborador ON public.frequencias(colaborador_id);

ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read frequencias of their units"
ON public.frequencias FOR SELECT TO authenticated
USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users insert frequencias in their units"
ON public.frequencias FOR INSERT TO authenticated
WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users update frequencias in their units"
ON public.frequencias FOR UPDATE TO authenticated
USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE POLICY "Users delete frequencias in their units"
ON public.frequencias FOR DELETE TO authenticated
USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE TRIGGER update_frequencias_updated_at
BEFORE UPDATE ON public.frequencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();