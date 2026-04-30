## Objetivo

Tornar rigorosas as regras de cadastro e cálculo de **Adicionais** e **Descontos** do Padrão 01, eliminando todas as situações que podem gerar erro financeiro. Banco já está limpo (zero registros problemáticos), então as correções são preventivas.

## Decisões já tomadas

- Vigência incompleta (mês sem ano ou vice-versa) → **bloqueia o salvamento**
- Desconto com base = "líquido" → **bloquear no cadastro** (só base permitida: salário base ou bruto)
- Adicional individual sem colaborador → **bloquear novos** (não há antigos para limpar)

---

## Etapa 1 — Validação rigorosa no cadastro (Adicionais e Descontos)

Adotar **Zod** para validação tipada antes de qualquer insert/update. Cada formulário ganha um schema único:

**`src/lib/validators/financeiro.ts`** (novo): schemas Zod compartilhados.

Regras aplicadas em `Adicionais.tsx` e `Descontos.tsx`:

1. Descrição/rubrica obrigatória, trim, máximo 200 caracteres.
2. Valor: número ≥ 0, máximo 1.000.000,00. Casas decimais limitadas a 2.
3. Percentual: número entre 0,01 e 100. Casas decimais limitadas a 2.
4. Modo `percentual` exige `base_calculo` preenchido.
5. Em **Descontos**: opção `base_calculo = 'liquido'` removida do dropdown (componente `RegraCalculoFields` aceita prop `excludeBases`).
6. Vigência (mês/ano e mês_fim/ano_fim): se um for preenchido, o par obrigatório. Bloqueia salvar com mensagem clara.
7. Se vigência início + fim preenchidas: fim ≥ início (compara `ano*100+mes`).
8. Escopo `individual` exige pelo menos 1 colaborador. Hoje o front já checa, mas vamos centralizar no schema.
9. Erros aparecem inline embaixo do campo (não só toast).

Botão "Salvar" só habilita se `schema.safeParse()` passar.

## Etapa 2 — Defesa em profundidade (banco)

Adicionar **CHECK constraints** e **validação por trigger** (não constraint, para regras temporais):

```sql
-- Adicionais
ALTER TABLE adicionais ADD CONSTRAINT chk_adicionais_valor_pos CHECK (valor >= 0);
ALTER TABLE adicionais ADD CONSTRAINT chk_adicionais_pct_range CHECK (percentual IS NULL OR (percentual > 0 AND percentual <= 100));
ALTER TABLE adicionais ADD CONSTRAINT chk_adicionais_individual_tem_colab 
  CHECK (escopo <> 'individual' OR colaborador_id IS NOT NULL);
ALTER TABLE adicionais ADD CONSTRAINT chk_adicionais_vigencia_inicio
  CHECK ((mes IS NULL AND ano IS NULL) OR (mes IS NOT NULL AND ano IS NOT NULL));
ALTER TABLE adicionais ADD CONSTRAINT chk_adicionais_vigencia_fim
  CHECK ((mes_fim IS NULL AND ano_fim IS NULL) OR (mes_fim IS NOT NULL AND ano_fim IS NOT NULL));

-- Mesmas regras espelhadas em Descontos (sem ano_fim/mes_fim, que descontos não têm)
ALTER TABLE descontos ADD CONSTRAINT chk_descontos_valor_pos CHECK (valor >= 0);
ALTER TABLE descontos ADD CONSTRAINT chk_descontos_pct_range CHECK (percentual IS NULL OR (percentual > 0 AND percentual <= 100));
ALTER TABLE descontos ADD CONSTRAINT chk_descontos_individual_tem_colab 
  CHECK (escopo <> 'individual' OR colaborador_id IS NOT NULL);
ALTER TABLE descontos ADD CONSTRAINT chk_descontos_vigencia
  CHECK ((mes IS NULL AND ano IS NULL) OR (mes IS NOT NULL AND ano IS NOT NULL));
ALTER TABLE descontos ADD CONSTRAINT chk_descontos_base_nao_liquido 
  CHECK (base_calculo IS NULL OR base_calculo IN ('salario_base','bruto'));
```

Mesmo se um dia alguém tentar inserir via SQL direto ou bug no front, o banco recusa.

## Etapa 3 — Cálculo da folha: precisão financeira

Em `FolhaProcessamento.tsx`:

1. **Substituir `.toFixed(2)` parcial por arredondamento só nos totais finais**. Hoje cada adicional é arredondado individualmente, gera diferença de centavos quando há muitos.
2. Usar função utilitária `roundMoney(n)` que faz `Math.round(n * 100) / 100` apenas nos campos persistidos: `total_adicionais`, `total_descontos`, `bruto`, `liquido`.
3. **Snapshot de % global**: hoje quando você cadastra um adicional global em %, o `valor` salvo no banco vai zero porque não existe colaborador de referência. Vou trocar pra salvar `valor = 0` explicitamente com um comentário (o cálculo real acontece na folha mesmo) e mostrar na listagem o badge "% sobre [base]" em vez do valor zero (que confunde).
4. **Logs de auditoria**: ao gerar/processar folha, gravar em `logs_sistema` o resumo (total bruto, líquido, qtd colaboradores) com categoria `folha`.

## Etapa 4 — UX: feedback claro pro usuário

1. Em `Adicionais.tsx` e `Descontos.tsx`, mostrar erros do Zod inline (vermelho embaixo do campo) em vez de só toast.
2. Na coluna "Valor" da listagem de adicionais globais em %, mostrar `"5% sobre salário base"` em vez de `R$ 0,00`.
3. Tooltip no campo "Base de cálculo" explicando cada opção.
4. Na tela `FolhaProcessamento`, exibir badge "Padrão 01" no cabeçalho pra deixar claro o fluxo ativo.

## Etapa 5 — Verificação

- Build limpo.
- Smoke test manual: tentar salvar cada caso bloqueado (vigência só com mês, individual sem colaborador, desconto com base líquido, percentual 150%, valor negativo) — todos devem falhar com mensagem clara.
- Gerar uma folha de teste com adicionais % global + descontos % bruto + descontos fixos, conferir totais.
- Rodar `supabase--linter` pra garantir que as constraints não quebraram nada.

---

## Detalhes técnicos

- **Por que Zod e não validação inline**: schemas reutilizáveis entre Adicionais e Descontos, mensagens consistentes, type-safety e fácil de estender.
- **Por que CHECK e não trigger**: as regras escolhidas são todas estáticas (não dependem de `now()`), CHECK é mais rápido e mais simples.
- **Constraint `chk_adicionais_individual_tem_colab`**: já validamos no front, mas trigger no banco impede qualquer bypass (importação CSV, SQL manual, bug futuro).
- **Migração não destrutiva**: como banco já está limpo, todas as constraints aplicam sem precisar limpar nada antes. Confirmei via `read_query` (zero violações em todas as 6 categorias verificadas).
- **`base_calculo = 'liquido'`**: como nenhum desconto hoje usa essa opção, a constraint passa direto. Front ganha aviso ao tentar editar registro legado (caso apareça no futuro).

## Resumo do impacto

- **Garantido**: nenhum cadastro inválido entra no sistema, nem pelo front nem pelo banco.
- **Precisão de centavos**: arredondamento só no fim, sem propagação de erro.
- **Visibilidade**: erros inline + auditoria em logs.
- **Risco de quebrar produção**: mínimo. Zero registros existentes violam as novas regras.
