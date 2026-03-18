
-- Tabela Secretarias
CREATE TABLE public.secretarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to secretarias" ON public.secretarias FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela Funções
CREATE TABLE public.funcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to funcoes" ON public.funcoes FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela Lotações
CREATE TABLE public.lotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  secretaria_id uuid REFERENCES public.secretarias(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to lotacoes" ON public.lotacoes FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela Colaboradores
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  matricula text,
  secretaria_id uuid REFERENCES public.secretarias(id),
  funcao_id uuid REFERENCES public.funcoes(id),
  lotacao_id uuid REFERENCES public.lotacoes(id),
  salario_base numeric NOT NULL DEFAULT 0,
  data_admissao date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to colaboradores" ON public.colaboradores FOR ALL TO public USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX idx_colaboradores_cpf ON public.colaboradores(cpf);
CREATE INDEX idx_colaboradores_secretaria ON public.colaboradores(secretaria_id);
CREATE INDEX idx_colaboradores_funcao ON public.colaboradores(funcao_id);
CREATE INDEX idx_colaboradores_lotacao ON public.colaboradores(lotacao_id);
CREATE INDEX idx_lotacoes_secretaria ON public.lotacoes(secretaria_id);
