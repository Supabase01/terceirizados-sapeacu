## Controle de Faltas integrado à Frequência

Adicionar o registro de **quantidade de faltas** ao módulo Frequência e descontá-las automaticamente da folha do colaborador na competência correspondente.

### Regra de cálculo
```
Desconto por faltas = (Salário Bruto / 30) × quantidade de faltas
```
- Aplicado por colaborador na competência (mês/ano) da frequência.
- O Bruto usado é o calculado na folha daquela competência (Padrão 01: base + adicionais; Padrão 02: líquido + encargos).
- Faltas = 0 → não gera desconto.

### Mudanças no banco
1. Adicionar coluna `faltas` (integer, default 0, ≥ 0) na tabela `frequencias`.
2. Adicionar coluna opcional `desconto_faltas` (numeric, default 0) — calculada e exibida, mas o cálculo "fonte da verdade" continua na geração da folha.

### Mudanças na UI — `src/pages/Frequencia.tsx`
1. Nova coluna **"Faltas"** na tabela com input numérico inline (0 por padrão) por colaborador.
   - Editável apenas quando o status é `entregue` ou `justificado`.
   - Salva ao perder foco (onBlur) ou Enter, com debounce.
2. Novo card de resumo: **"Total de faltas"** (soma de todas as faltas da competência).
3. **Marcação em lote** (`Marcar como entregue`) → segue zerando faltas (faltas = 0). Mantém comportamento atual.
4. **Marcação individual** → após marcar como entregue, abre opcionalmente o input de faltas na linha (já visível na coluna). Mantém fluxo simples.
5. No diálogo de Observação: adicionar campo "Quantidade de faltas" para edição rápida junto com a justificativa.
6. Badge visual na linha quando `faltas > 0` (ex: `Badge` âmbar "3 faltas").

### Mudanças na Folha — `src/pages/FolhaProcessamento.tsx`
1. Na função de geração da folha (após calcular `bruto` e antes de aplicar descontos):
   - Buscar `frequencias` da competência (`mes`, `ano`, `unidade_id`) com `faltas > 0`.
   - Para cada colaborador com faltas: `descontoFaltas = (bruto / 30) * faltas`.
   - Somar ao `total_descontos` e subtrair do `liquido`.
   - Aplica-se a Padrão 01 normalmente. Para Padrão 02, descontar do líquido (recalcular líquido = líquido_original − descontoFaltas; bruto permanece).
2. Registrar nos detalhes da folha (campo já existente ou via observação) que parte do desconto vem de faltas — opcional, sem nova coluna.

### Feedback visual na folha
- Na tabela da folha em processamento, exibir um badge pequeno "Nº faltas" ao lado do nome quando houver faltas registradas no mês.

### Arquivos a alterar
- `supabase/migrations/<novo>.sql` — adicionar `faltas` e `desconto_faltas` em `frequencias`.
- `src/pages/Frequencia.tsx` — input inline de faltas, card resumo, salvar individual, badge.
- `src/pages/FolhaProcessamento.tsx` — buscar frequências e aplicar desconto de faltas no cálculo.
- `src/integrations/supabase/types.ts` — auto-regenerado.

### Detalhes técnicos
- Salvar faltas via `upsert` no mesmo padrão atual (`onConflict: 'colaborador_id,mes,ano'`).
- Validação: faltas inteiras ≥ 0 e ≤ 31.
- Lote sempre força `faltas = 0` (regra do usuário: "em lote por padrão é falta 0").
- Cálculo do desconto usa `roundMoney` apenas no total final, não no intermediário (padrão do projeto).