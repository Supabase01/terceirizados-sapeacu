
CREATE TABLE public.rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  unidade_id uuid REFERENCES public.unidades_folha(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(codigo, unidade_id)
);

ALTER TABLE public.rubricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read rubricas of their units" ON public.rubricas FOR SELECT TO authenticated USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert rubricas in their units" ON public.rubricas FOR INSERT TO authenticated WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update rubricas in their units" ON public.rubricas FOR UPDATE TO authenticated USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete rubricas in their units" ON public.rubricas FOR DELETE TO authenticated USING (user_has_unidade_access(auth.uid(), unidade_id));

CREATE TRIGGER audit_rubricas AFTER INSERT OR UPDATE OR DELETE ON public.rubricas FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
