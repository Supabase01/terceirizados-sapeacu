
-- Tabela de logs do sistema para rastrear eventos operacionais
CREATE TABLE public.logs_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'info',
  categoria text NOT NULL DEFAULT 'sistema',
  descricao text NOT NULL,
  detalhes jsonb DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  user_email text DEFAULT NULL,
  unidade_id uuid REFERENCES public.unidades_folha(id) ON DELETE SET NULL DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_logs_sistema_created_at ON public.logs_sistema(created_at DESC);
CREATE INDEX idx_logs_sistema_categoria ON public.logs_sistema(categoria);
CREATE INDEX idx_logs_sistema_tipo ON public.logs_sistema(tipo);

-- RLS
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins read all system logs"
ON public.logs_sistema FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_master(auth.uid()));

-- Authenticated users can insert logs
CREATE POLICY "Authenticated insert system logs"
ON public.logs_sistema FOR INSERT TO authenticated
WITH CHECK (true);

-- Route permissions
INSERT INTO public.route_permissions (route_path, module_name, role, allowed) VALUES
  ('/auditoria/sistema', 'Auditoria', 'admin', true),
  ('/auditoria/sistema', 'Auditoria', 'usuario', true);
