

# Receber Todos os Dados (sem limite)

## Problema Atual
- O Supabase retorna no maximo **1.000 linhas** por query (limite padrao da API)
- O hook `usePayrollData` faz uma unica chamada `.select('*')`, entao dados acima de 1.000 registros sao silenciosamente ignorados
- A importacao funciona em lotes de 500, mas a leitura nao

## Solucao

### 1. Leitura paginada no `usePayrollData.ts`
Implementar busca recursiva que carrega **todos** os registros do banco em blocos de 1.000, concatenando ate nao haver mais dados:

```
Bloco 1: range(0, 999)    -> 1000 registros
Bloco 2: range(1000, 1999) -> 1000 registros
Bloco 3: range(2000, 2999) -> 800 registros (fim)
Total: 2800 registros carregados
```

### 2. Manter importacao robusta
A importacao ja envia em lotes de 500 -- isso esta adequado. Nenhuma alteracao necessaria.

## Arquivo Alterado

- `src/hooks/usePayrollData.ts` -- substituir query simples por loop paginado com `.range()`

## Detalhe Tecnico

A funcao `queryFn` passara a usar um loop que chama `.range(from, to)` repetidamente ate receber menos de 1.000 registros (indicando que acabou). Todos os blocos sao concatenados em um unico array antes de retornar.

