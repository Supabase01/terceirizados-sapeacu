
-- Triggers de auditoria para tabelas principais
CREATE TRIGGER audit_colaboradores AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_secretarias AFTER INSERT OR UPDATE OR DELETE ON public.secretarias FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_funcoes AFTER INSERT OR UPDATE OR DELETE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_lotacoes AFTER INSERT OR UPDATE OR DELETE ON public.lotacoes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_liderancas AFTER INSERT OR UPDATE OR DELETE ON public.liderancas FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_adicionais AFTER INSERT OR UPDATE OR DELETE ON public.adicionais FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_descontos AFTER INSERT OR UPDATE OR DELETE ON public.descontos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_encargos AFTER INSERT OR UPDATE OR DELETE ON public.encargos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_unidades_folha AFTER INSERT OR UPDATE OR DELETE ON public.unidades_folha FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_folha_processamento AFTER INSERT OR UPDATE OR DELETE ON public.folha_processamento FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_cidades AFTER INSERT OR UPDATE OR DELETE ON public.cidades FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_prefeituras AFTER INSERT OR UPDATE OR DELETE ON public.prefeituras FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
CREATE TRIGGER audit_terceirizadas AFTER INSERT OR UPDATE OR DELETE ON public.terceirizadas FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
