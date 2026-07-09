## Objetivo
Redefinir a senha do usuário **Neemias** (`n.neemias@gmail.com`) para uma nova senha temporária.

## Contexto
- A troca de senha de outro usuário exige a Service Role (admin), portanto precisa ser feita por Edge Function, não pelo cliente.
- Já existe `create-user` e `delete-user`; vou criar uma nova função `reset-user-password` no mesmo padrão (verifica se o solicitante é admin/master antes de executar).

## Passos
1. Criar Edge Function `reset-user-password`:
   - Recebe `{ user_id, new_password }`.
   - Valida JWT do chamador e confere se é `admin` (via `has_role`) ou master.
   - Usa `supabase.auth.admin.updateUserById(user_id, { password })`.
   - Registra em `audit_log` / log do sistema.
2. Definir a nova senha como **`Neemias@2026`** (padrão temporário — o usuário troca depois em "Minha Conta"). Se preferir outra, me diga.
3. Invocar a função uma única vez para o `user_id` `2ea6bad6-96a4-42c0-ad23-c6e2fbd15f43`.
4. (Opcional) Adicionar botão "Redefinir senha" na tela de Gestão de Usuários para futuras redefinições — posso incluir agora ou deixar só a ação pontual desta vez.

## Detalhes técnicos
- Endpoint: `supabase/functions/reset-user-password/index.ts`, CORS liberado, `verify_jwt = true`.
- Guarda: `SUPABASE_SERVICE_ROLE_KEY` (já disponível no ambiente da função).
- Auditoria: `registrarLog` equivalente server-side inserindo em `log_sistema` (categoria `autenticacao`).

## Confirme antes de executar
- Nova senha temporária = `Neemias@2026`? (posso trocar)
- Quer que eu já adicione o botão "Redefinir senha" na tela de usuários, ou faço só a redefinição pontual agora?
