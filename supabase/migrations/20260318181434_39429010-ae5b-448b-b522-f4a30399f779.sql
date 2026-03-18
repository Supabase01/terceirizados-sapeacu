
CREATE TABLE public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  estado text NOT NULL DEFAULT 'BA',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cidades" ON public.cidades FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_cidades AFTER INSERT OR UPDATE OR DELETE ON public.cidades FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
