

## Plano: Aplicar 3 Correções de Segurança RLS

### Correção 1 — `cidades`
- Remover a policy `Allow all access to cidades` (role `public`, comando `ALL`)
- Criar policy SELECT para `authenticated` com `USING (true)`
- Criar policy ALL (INSERT/UPDATE/DELETE) para `authenticated` restrita a `has_role(auth.uid(), 'admin') OR is_master(auth.uid())`

### Correção 2 — `profiles`
- Remover a policy `Users can view all profiles` (SELECT com `USING (true)`)
- Criar nova policy SELECT que retorna apenas o próprio registro: `USING (id = auth.uid())`
- Criar policy separada para admins verem todos os profiles (necessário para tela de administração)
- Revisar código front-end que lista profiles (ex: `AdminConfig.tsx`) para garantir que admin ainda funcione

### Correção 3 — `audit_log`
- Remover a policy `System can insert audit_log` (INSERT para `authenticated`)
- O trigger `fn_audit_log` usa `SECURITY DEFINER`, então insere sem precisar de policy INSERT

### Detalhes Técnicos
Uma única migration SQL com os 3 blocos de `DROP POLICY` / `CREATE POLICY`. Nenhuma alteração de código front-end necessária — o `AdminConfig` já usa `has_role` para verificar admin, e a query de profiles para admin será coberta pela nova policy com check de admin.

