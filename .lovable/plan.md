

# Integrar Folha Processada nos Relatoios e Alertas

## Situacao atual

- **Relatorios** e **Alertas** consomem dados exclusivamente da tabela `payroll_records` (via `usePayrollData`)
- `payroll_records` e alimentada apenas por importacao de Excel
- `folha_processamento` tem dados calculados (base + adicionais - descontos) mas nao alimenta nenhum relatorio
- O campo `pasta` em `payroll_records` equivale a `secretaria` em `folha_processamento`
- `payroll_records` nao tem campos como `salario_base`, `total_adicionais`, `total_descontos`

## Decisoes necessarias

Existem duas abordagens possiveis:

### Opcao A — Inserir em `payroll_records` ao processar

Quando a folha e finalizada (status "processado"), copiar os registros para `payroll_records` mapeando:
- `secretaria` → `pasta`
- `unidade_nome` → `prefeitura`
- Demais campos ja existem (nome, cpf, funcao, bruto, liquido, mes, ano)

**Vantagens**: Zero alteracao em Relatorios/Alertas/Indicadores — tudo funciona automaticamente.
**Desvantagens**: Dados duplicados entre tabelas; precisa de logica para evitar duplicatas ao reprocessar.

### Opcao B — Unificar leitura no `usePayrollData`

Alterar o hook para buscar de ambas as tabelas e mesclar os resultados, normalizando os campos.

**Vantagens**: Sem duplicacao de dados.
**Desvantagens**: Mais complexo; precisa adaptar filtros e campos em varios componentes; performance de duas queries.

### Opcao C — Substituir `payroll_records` por `folha_processamento`

Migrar completamente para usar apenas `folha_processamento` como fonte de dados, eliminando a importacao Excel.

**Vantagens**: Arquitetura mais limpa a longo prazo.
**Desvantagens**: Perde o historico importado; mudanca grande.

## Recomendacao

**Opcao A** e a mais pragmatica. Ao clicar "Processar" na folha:

1. Buscar o nome da unidade para preencher `prefeitura`
2. Inserir em `payroll_records` com `pasta = secretaria`
3. Antes de inserir, deletar registros anteriores do mesmo mes/ano/unidade para permitir reprocessamento
4. Relatorios, Alertas e Indicadores funcionam sem nenhuma alteracao

### Mudancas tecnicas

| Arquivo | Alteracao |
|---|---|
| `src/pages/FolhaProcessamento.tsx` | Na `finalizeMutation`: apos marcar como processado, inserir registros em `payroll_records` (deletando anteriores do mesmo periodo/unidade) |
| `src/types/payroll.ts` | Nenhuma (campos ja compatíveis) |
| Relatorios/Alertas/Indicadores | Nenhuma alteracao |

