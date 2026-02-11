
# Reestruturar: Dashboard vira "Indicadores" com abas, e Relatorios vira tabelas

## Resumo

Renomear "Dashboard" para **"Indicadores"** e dividir em duas abas internas: **Indicadores Gerais** (conteudo atual do Dashboard) e **Indicadores Mensais** (conteudo atual de Relatorios com graficos e KPIs por periodo). A pagina de **Relatorios** passa a focar exclusivamente em relatorios tabulares com exportacao PDF/Excel.

---

## Mudancas

### 1. Renomear Dashboard para Indicadores
- **Layout.tsx**: Trocar label "Dashboard" por "Indicadores" e icone `LayoutDashboard` por `BarChart3` no menu
- **App.tsx**: Renomear rota `/dashboard` para `/indicadores` e atualizar o import

### 2. Pagina Indicadores com abas (Tabs)
- **Renomear `Dashboard.tsx` para `Indicadores.tsx`** (ou manter o arquivo e renomear o componente)
- Usar o componente `Tabs` do Radix para criar duas abas:
  - **"Gerais"**: Todo o conteudo atual do Dashboard (KPIs de custo, impacto, admissoes/desligamentos, graficos de evolucao, composicao por pasta, headcount)
  - **"Mensais"**: Mover o conteudo atual de Relatorios (filtro por mes, resumo executivo com Folha Bruta/Liquida/Colaboradores/Salario Medio, graficos de composicao, faixas salariais, custo por secretaria, top funcoes, resumo de auditoria, indicadores gerais)

### 3. Pagina Relatorios - foco em tabelas
- Reescrever `Relatorios.tsx` para ser uma pagina de relatorios tabulares com:
  - Filtro por periodo (mes/ano)
  - **Relatorio por Secretaria**: Tabela com Secretaria, Qtd Colaboradores, Total Bruto, Total Liquido, Total Descontos, % do Total
  - **Relatorio por Funcao**: Tabela com Funcao, Qtd, Total Bruto, Media Bruto
  - **Relatorio de Maiores Salarios**: Top 20 maiores salarios com Nome, CPF, Funcao, Pasta, Bruto, Liquido
  - Botoes de exportacao PDF e Excel em cada tabela
  - Reutilizar as funcoes `exportToPDF` e `exportToExcel` ja existentes

### 4. Ajustes de navegacao
- Atualizar `PinAccess.tsx` (redirect apos login) se redireciona para `/dashboard` -> `/indicadores`
- Atualizar quaisquer links internos

---

## Detalhes tecnicos

### Arquivos modificados:
1. **`src/components/Layout.tsx`** - Renomear item de nav: href `/dashboard` -> `/indicadores`, label "Indicadores", icone `BarChart3`
2. **`src/App.tsx`** - Rota `/indicadores`, import do novo componente
3. **`src/pages/Dashboard.tsx`** -> **`src/pages/Indicadores.tsx`** - Adicionar Tabs com aba "Gerais" (conteudo atual) e "Mensais" (conteudo vindo de Relatorios)
4. **`src/pages/Relatorios.tsx`** - Reescrever com 3 tabelas (por Secretaria, por Funcao, Top Salarios) com filtro de periodo e exportacao
5. **`src/pages/PinAccess.tsx`** - Verificar redirect para `/indicadores`

### Componentes utilizados:
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (ja disponivel em `src/components/ui/tabs.tsx`)
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` (ja disponivel)
- `exportToPDF`, `exportToExcel` de `src/lib/exportUtils.ts`
