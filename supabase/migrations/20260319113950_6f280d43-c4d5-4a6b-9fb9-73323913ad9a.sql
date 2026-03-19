
-- ============================================================
-- FIX: unidades_folha – correct the buggy "Users read own units" policy
-- ============================================================
DROP POLICY IF EXISTS "Users read own units" ON public.unidades_folha;
CREATE POLICY "Users read own units" ON public.unidades_folha
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuario_unidades uu
      WHERE uu.unidade_id = unidades_folha.id AND uu.user_id = auth.uid()
    )
  );

-- ============================================================
-- colaboradores – replace open policy with unit isolation
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to colaboradores" ON public.colaboradores;
CREATE POLICY "Users read colaboradores of their units" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert colaboradores in their units" ON public.colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update colaboradores in their units" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete colaboradores in their units" ON public.colaboradores
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- secretarias
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to secretarias" ON public.secretarias;
CREATE POLICY "Users read secretarias of their units" ON public.secretarias
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert secretarias in their units" ON public.secretarias
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update secretarias in their units" ON public.secretarias
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete secretarias in their units" ON public.secretarias
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- funcoes
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to funcoes" ON public.funcoes;
CREATE POLICY "Users read funcoes of their units" ON public.funcoes
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert funcoes in their units" ON public.funcoes
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update funcoes in their units" ON public.funcoes
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete funcoes in their units" ON public.funcoes
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- lotacoes
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to lotacoes" ON public.lotacoes;
CREATE POLICY "Users read lotacoes of their units" ON public.lotacoes
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert lotacoes in their units" ON public.lotacoes
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update lotacoes in their units" ON public.lotacoes
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete lotacoes in their units" ON public.lotacoes
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- liderancas
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to liderancas" ON public.liderancas;
CREATE POLICY "Users read liderancas of their units" ON public.liderancas
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert liderancas in their units" ON public.liderancas
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update liderancas in their units" ON public.liderancas
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete liderancas in their units" ON public.liderancas
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- adicionais
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to adicionais" ON public.adicionais;
CREATE POLICY "Users read adicionais of their units" ON public.adicionais
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert adicionais in their units" ON public.adicionais
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update adicionais in their units" ON public.adicionais
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete adicionais in their units" ON public.adicionais
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- descontos
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to descontos" ON public.descontos;
CREATE POLICY "Users read descontos of their units" ON public.descontos
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert descontos in their units" ON public.descontos
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update descontos in their units" ON public.descontos
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete descontos in their units" ON public.descontos
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- payroll_records
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to payroll_records" ON public.payroll_records;
CREATE POLICY "Users read payroll_records of their units" ON public.payroll_records
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert payroll_records in their units" ON public.payroll_records
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update payroll_records in their units" ON public.payroll_records
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete payroll_records in their units" ON public.payroll_records
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- folha_processamento – replace open authenticated policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated full access folha_processamento" ON public.folha_processamento;
CREATE POLICY "Users read folha_processamento of their units" ON public.folha_processamento
  FOR SELECT TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users insert folha_processamento in their units" ON public.folha_processamento
  FOR INSERT TO authenticated
  WITH CHECK (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users update folha_processamento in their units" ON public.folha_processamento
  FOR UPDATE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));
CREATE POLICY "Users delete folha_processamento in their units" ON public.folha_processamento
  FOR DELETE TO authenticated
  USING (user_has_unidade_access(auth.uid(), unidade_id));

-- ============================================================
-- prefeituras – admin/master write, authenticated read
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to prefeituras" ON public.prefeituras;
CREATE POLICY "Authenticated read prefeituras" ON public.prefeituras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prefeituras" ON public.prefeituras
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR is_master(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') OR is_master(auth.uid()));

-- ============================================================
-- terceirizadas – admin/master write, authenticated read
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to terceirizadas" ON public.terceirizadas;
CREATE POLICY "Authenticated read terceirizadas" ON public.terceirizadas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage terceirizadas" ON public.terceirizadas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR is_master(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') OR is_master(auth.uid()));
