
-- Tabela de registros de folha de pagamento
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefeitura TEXT NOT NULL,
  pasta TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  cpf TEXT NOT NULL,
  bruto NUMERIC NOT NULL DEFAULT 0,
  liquido NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configuração de acesso (PIN)
CREATE TABLE public.access_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin TEXT NOT NULL DEFAULT '1234'
);

-- Inserir PIN padrão
INSERT INTO public.access_config (pin) VALUES ('1234');

-- Função RPC para validar PIN
CREATE OR REPLACE FUNCTION public.validate_pin(input_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_config WHERE pin = input_pin
  );
$$;

-- RLS na payroll_records: acesso público (sem auth tradicional, protegido por PIN)
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to payroll_records" ON public.payroll_records FOR ALL USING (true) WITH CHECK (true);

-- RLS na access_config: apenas leitura via RPC
ALTER TABLE public.access_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access_config" ON public.access_config FOR SELECT USING (true);

-- Índices para performance
CREATE INDEX idx_payroll_ano_mes ON public.payroll_records (ano, mes);
CREATE INDEX idx_payroll_cpf ON public.payroll_records (cpf);
