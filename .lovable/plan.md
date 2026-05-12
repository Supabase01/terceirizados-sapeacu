## Causa do problema

A unidade **Sapeaçu** tem **1.555 colaboradores ativos**, mas as telas **Adicionais** e **Descontos** carregavam o select com uma única consulta Supabase, sujeita ao limite padrão de 1.000 linhas. Maria Beatriz ficava fora desse corte e por isso não aparecia. Ela está corretamente cadastrada e ativa — não é necessário mudar nada no cadastro dela.

## Solução: busca server-side com debounce

Em vez de carregar todos os colaboradores de uma vez (que ficaria pesado conforme a unidade crescer para 5k, 10k+), o select passa a **consultar o banco conforme o usuário digita**. Isso escala para qualquer volume.

### Comportamento do novo select

- Ao **abrir** o select: mostra os **20 primeiros** colaboradores ativos da unidade (ordem alfabética) como prévia.
- Ao **digitar** (mín. 2 caracteres): aguarda **300ms** (debounce) e consulta o banco filtrando por `nome ILIKE '%termo%' OR cpf ILIKE '%termo%'`, retornando até **50 resultados**.
- Mostra "Carregando..." enquanto a busca está em andamento e "Nenhum colaborador encontrado" se não houver resultado.
- Cache por termo (via React Query `placeholderData`) para evitar re-fetch ao reabrir.

### Telas afetadas

1. `src/pages/Adicionais.tsx` — select de colaborador (escopo Individual e Grupo).
2. `src/pages/Descontos.tsx` — mesma correção (mesmo bug latente).

### Detalhes técnicos

- Criar um hook reutilizável `useColaboradoresSearch(unidadeId, term)` que faz a query paginada (`limit(50)`).
- Ajustar o `SearchableSelect` (ou criar variante `AsyncSearchableSelect`) para aceitar:
  - `onSearchChange(term)` → dispara debounce.
  - `loading` → exibe estado de carregamento.
  - `options` recebidas dinamicamente (não filtra mais no cliente).
- Para o **modo "Grupo"** (multi-seleção), manter os IDs já selecionados em estado separado e exibir os nomes correspondentes mesmo que não estejam no resultado atual da busca (busca extra por IDs selecionados quando necessário).
- Edição de um adicional/desconto existente: ao abrir o diálogo com `colaborador_id` já preenchido, fazer um fetch pontual desse colaborador para mostrar o nome no select.

### Resultado

- Maria Beatriz (e qualquer outro entre os 1.555) é encontrada digitando parte do nome ou CPF.
- A tela abre instantaneamente, independente do tamanho da unidade.
- Pronto para escalar para unidades com 10k+ colaboradores sem perda de performance.