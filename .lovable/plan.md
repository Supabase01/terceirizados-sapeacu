

## Plano: Sistema de Padrões + Encargos com Escopo (Global/Individual)

### 1. Migração do banco de dados

**Coluna `padrao` em `unidades_folha`:**
- `ALTER TABLE unidades_folha ADD COLUMN padrao text NOT NULL DEFAULT 'padrao_01'`

**Nova tabela `encargos`:**
```text
id              uuid PK default gen_random_uuid()
nome            text NOT NULL
percentual      numeric NOT NULL default 0
escopo          text NOT NULL default 'global'  -- 'global' ou 'individual'
colaborador_id  uuid NULL                       -- NULL quando global
unidade_id      uuid NULL
ativo           boolean NOT NULL default true
created_at      timestamptz default now()
```
- RLS: `user_has_unidade_access(auth.uid(), unidade_id)` para SELECT/INSERT/UPDATE/DELETE

**Coluna `total_encargos` em `folha_processamento`:**
- `ALTER TABLE folha_processamento ADD COLUMN total_encargos numeric NOT NULL DEFAULT 0`

**Permissões de rota** para `/cadastro/encargos` (admin + usuario)

### 2. Contexto da Unidade (`UnidadeContext.tsx`)
- Adicionar `unidadePadrao` ao estado e sessionStorage
- Atualizar `SelecionarUnidade.tsx` para carregar e salvar o padrão

### 3. Cadastro de Unidades (`CadastroUnidades.tsx`)
- Adicionar campo Select "Padrão" no formulário (Padrao 01 / Padrao 02)
- Exibir na tabela

### 4. Nova Pagina: Cadastro de Encargos (`/cadastro/encargos`)
- CRUD com escopo global/individual (mesmo padrão de Adicionais/Descontos)
- Global: aplica a todos os colaboradores da unidade
- Individual: permite selecionar colaboradores via `SearchableSelect`
- Campos: Nome, Percentual (%), Escopo
- Visivel apenas quando unidade ativa for Padrao 02 (ocultar do sidebar se Padrao 01)
- Sidebar: adicionar no grupo "Cadastros"

### 5. Cadastro de Colaboradores (`CadastroColaboradores.tsx`)
- Padrao 01: label "Salario Base"
- Padrao 02: label "Salario Liquido"

### 6. Processamento da Folha (`FolhaProcessamento.tsx`)
- **Padrao 01** (sem mudanca): `Bruto = Base + Adicionais; Liquido = Bruto - Descontos`
- **Padrao 02**:
  - `Liquido = salario_base` (valor cadastrado)
  - Buscar encargos ativos: globais + individuais do colaborador
  - `Total Encargos = Liquido x (soma dos percentuais / 100)`
  - `Bruto = Liquido + Total Encargos`
  - Colunas da tabela: Liquido | Encargos | Bruto

### 7. Adaptar visualizacao
- Tabela da folha e relatorios ajustam colunas/labels conforme padrao ativo

### Detalhes tecnicos

**Encargos por colaborador**: Um encargo global gera uma unica linha (`colaborador_id = NULL`). Na hora do calculo, o sistema soma os encargos globais + os individuais vinculados ao colaborador especifico.

**Calculo Padrao 02**:
```text
encargos_colaborador = encargos WHERE (escopo='global' OR colaborador_id=colab.id)
soma_percentuais = SUM(percentual) dos encargos_colaborador
Total Encargos = Liquido x (soma_percentuais / 100)
Bruto = Liquido + Total Encargos
```

**Sidebar condicional**: O item "Encargos" so aparece se `unidadePadrao === 'padrao_02'`, usando o contexto ja disponivel.

