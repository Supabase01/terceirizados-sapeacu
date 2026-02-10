
# Botao "Limpar Banco de Dados" na pagina de Importacao

## O que sera feito

Adicionar um botao vermelho "Limpar Banco de Dados" na pagina de Importacao (`/import`), com dialogo de confirmacao para evitar exclusao acidental. Ao confirmar, todos os registros da tabela `payroll_records` serao deletados.

## Detalhes

### Arquivo alterado: `src/pages/Import.tsx`

1. **Importar** `AlertDialog` e icone `Trash2`
2. **Adicionar estado** `clearing` para controlar loading do botao
3. **Criar funcao `handleClearDatabase`** que executa `supabase.from('payroll_records').delete().gte('id', 0)` para remover todos os registros, seguido de `queryClient.invalidateQueries`
4. **Adicionar um Card** abaixo do card de upload com:
   - Titulo "Gerenciar Dados"
   - Botao vermelho (variant `destructive`) com icone de lixeira
   - AlertDialog de confirmacao com texto "Tem certeza? Todos os registros serao apagados permanentemente."
   - Botoes "Cancelar" e "Sim, limpar tudo"
5. Exibir toast de sucesso/erro apos a operacao
