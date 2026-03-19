

## Plano: Sistema de Padrões + Encargos ✅ IMPLEMENTADO

### O que foi feito:

1. **Migração DB**: coluna `padrao` em `unidades_folha`, tabela `encargos` com RLS, coluna `total_encargos` em `folha_processamento`, permissões de rota
2. **UnidadeContext**: `unidadePadrao` exposto no contexto e sessionStorage
3. **SelecionarUnidade**: carrega e salva o padrão junto com id/nome
4. **CadastroUnidades**: campo Select "Padrão" no formulário e coluna na tabela
5. **CadastroEncargos**: nova página CRUD com escopo global/individual
6. **CadastroColaboradores**: label dinâmico "Salário Base" / "Salário Líquido"
7. **FolhaProcessamento**: cálculo adaptado por padrão, cards e tabela condicionais
8. **AppSidebar**: item "Encargos" visível apenas para Padrão 02
9. **App.tsx**: rota `/cadastro/encargos` registrada
