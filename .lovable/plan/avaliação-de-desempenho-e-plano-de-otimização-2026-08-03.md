# Avaliação de desempenho e plano de otimização

O sistema está lento por três motivos confirmados: o app carrega tudo de uma vez no navegador, as telas baixam bases inteiras do banco antes de mostrar qualquer coisa, e o banco não tem índices para os filtros mais usados.

## O que foi verificado

- Todas as ~35 páginas são importadas de uma vez em `src/App.tsx` (nenhum `lazy`/`Suspense`): o primeiro acesso baixa e interpreta o sistema inteiro.
- Sem configuração global de cache no React Query (`new QueryClient()` sem `staleTime`/`gcTime`): trocar de aba refaz as consultas do zero.
- `usePayrollData` baixa **tudo** em laços de 1000 registros: hoje 7.774 linhas em `folha_processamento` + 7.932 em `payroll_records`, filtra e ordena no navegador. Relatórios/Indicadores/Comparativo dependem disso.
- Uso extensivo de `select('*')` (33 pontos), trazendo colunas que a tela não usa.
- Índices ausentes no banco para os filtros reais: `folha_processamento` só tem PK e a única (colaborador_id, mes, ano) — nada por `unidade_id`/`status`/período; `payroll_records` não tem índice por `unidade_id`; `colaboradores` não tem índice por `unidade_id`/`nome`; `adicionais` e `descontos` têm apenas a PK.
- Páginas muito grandes concentrando estado e cálculo em um só componente: `AdminConfig` (1.368 linhas), `FolhaProcessamento` (1.096), `Indicadores` (627), `FolhaProcessada` (607), `Alertas` (606).

## Plano de melhorias (em ordem de impacto)

### 1. Índices no banco (ganho imediato, sem risco de UI)
Migração criando:
- `folha_processamento (unidade_id, ano, mes)`, `folha_processamento (unidade_id, status)`, `folha_processamento (unidade_id, cpf)`
- `payroll_records (unidade_id, ano, mes)`
- `colaboradores (unidade_id, ativo)` e índice de busca por nome (trigram ou `lower(nome)`)
- `adicionais (unidade_id, colaborador_id)`, `descontos (unidade_id, colaborador_id)`

### 2. Carregamento sob demanda do app
- Converter as rotas em `React.lazy` + `Suspense` com um fallback de carregamento, mantendo Auth/PIN/Hub no pacote inicial.
- Separar bibliotecas pesadas (jsPDF, xlsx) em import dinâmico, carregadas só ao clicar em exportar/gerar PDF.

### 3. Cache global consistente
- `QueryClient` com `staleTime: 60s`, `gcTime: 5min`, `refetchOnWindowFocus: false`, `retry: 1`.

### 4. Parar de baixar bases inteiras
- Trocar os totais de Indicadores/Comparativo/Relatórios por agregação no banco (funções SQL de resumo por competência/secretaria), em vez de somar 15 mil linhas no navegador.
- Detalhamento e listagens de folha passam a usar paginação e busca no servidor (padrão já usado em `AsyncColaboradorSelect`), com filtros de ano/mês/secretaria enviados na consulta.
- Exportações (PDF/Excel) buscam o conjunto filtrado no momento da geração, sem manter tudo em memória.
- Substituir `select('*')` pelas colunas realmente usadas nas telas de maior volume.

### 5. Reduzir re-renderizações
- Quebrar `FolhaProcessamento`, `AdminConfig` e `Indicadores` em componentes menores (cabeçalho, filtros, tabela, modais) com `memo` nas linhas de tabela.
- Debounce em todos os campos de busca (hoje só alguns têm).

## Como executar
Sugiro em duas entregas: primeiro os itens 1–3 (rápidos, efeito perceptível em todo o sistema), depois o item 4 por módulo (Relatórios → Folha → Indicadores) e o item 5 junto de cada refatoração.

## Detalhes técnicos
- Índices criados via migração comum (`CREATE INDEX`, sem `CONCURRENTLY`), com `EXPLAIN ANALYZE` antes/depois nas consultas de folha.
- Agregações como funções `security invoker` no schema public respeitando RLS por `unidade_id`, com `GRANT EXECUTE` para `authenticated`.
- Nenhuma mudança em regra de cálculo de folha: o resultado financeiro precisa permanecer idêntico ao atual.
