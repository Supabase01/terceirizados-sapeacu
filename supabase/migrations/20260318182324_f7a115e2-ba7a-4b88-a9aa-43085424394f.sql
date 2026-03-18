
CREATE TABLE public.liderancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liderancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to liderancas" ON public.liderancas FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_liderancas AFTER INSERT OR UPDATE OR DELETE ON public.liderancas FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

ALTER TABLE public.colaboradores ADD COLUMN lideranca_id uuid REFERENCES public.liderancas(id);
