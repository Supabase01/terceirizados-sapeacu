
-- Tabela de log de auditoria
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id text,
  acao text NOT NULL,
  dados_anterior jsonb,
  dados_novo jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
BEGIN
  BEGIN
    _user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  BEGIN
    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  EXCEPTION WHEN OTHERS THEN
    _user_email := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novo, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), _user_id, _user_email);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anterior, dados_novo, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), _user_id, _user_email);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anterior, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), _user_id, _user_email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_colaboradores AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_adicionais AFTER INSERT OR UPDATE OR DELETE ON public.adicionais FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_descontos AFTER INSERT OR UPDATE OR DELETE ON public.descontos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_secretarias AFTER INSERT OR UPDATE OR DELETE ON public.secretarias FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_funcoes AFTER INSERT OR UPDATE OR DELETE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_lotacoes AFTER INSERT OR UPDATE OR DELETE ON public.lotacoes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_folha_processamento AFTER INSERT OR UPDATE OR DELETE ON public.folha_processamento FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_prefeituras AFTER INSERT OR UPDATE OR DELETE ON public.prefeituras FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_terceirizadas AFTER INSERT OR UPDATE OR DELETE ON public.terceirizadas FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER trg_audit_unidades_folha AFTER INSERT OR UPDATE OR DELETE ON public.unidades_folha FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log()
