

# Reestruturar Indicadores com abas e mover Comparativo para Relatorios

## Resumo

1. **Indicadores** ganha duas abas: "Gerais" (conteudo atual) e "Mensais" (indicadores graficos por periodo com filtro de mes)
2. **Relatorios** mantem as 3 abas tabulares atuais e ganha uma 4a aba "Comparativo" (conteudo atual da pagina Comparativo)
3. Remover a rota e o item de menu do Comparativo separado

---

## Mudancas detalhadas

### 1. Indicadores.tsx - Adicionar Tabs (Gerais + Mensais)

Envolver o conteudo existente do componente `Dashboard` em uma aba "Gerais" e criar uma aba "Mensais" com:

- **Filtro de periodo** (mes/ano) via Select
- **4 KPI cards**: Folha Bruta, Folha Liquida, Colaboradores, Salario Medio (com variacao % vs periodo anterior)
- **Grafico de pizza**: Liquido vs Descontos
- **Grafico de barras**: Faixas salariais (ate 1.500, 1.500-3.000, 3.000-5.000, 5.000-10.000, acima de 10.000)
- **Grafico de barras horizontal**: Top 10 funcoes por custo
- **Ranking de custo por Secretaria** com barras de progresso visuais
- **Resumo de auditoria** por severidade (alta, media, baixa) usando as funcoes de `auditChecks.ts`

O componente sera renomeado de `Dashboard` para `Indicadores`.

### 2. Relatorios.tsx - Adicionar aba Comparativo

Manter as 3 abas atuais (Por Secretaria, Por Funcao, Top Salarios) e adicionar uma 4a aba:

- **"Comparativo"**: Todo o conteudo atual de `Comparativo.tsx` (selecao de pares de meses consecutivos, filtro por tipo de variacao, busca por nome/CPF, tabela paginada com variacao nominal e percentual, exportacao PDF/Excel)

### 3. Navegacao e rotas

- **App.tsx**: Remover a rota `/comparativo` e o import do Comparativo
- **Layout.tsx**: Remover o item "Comparativo" (icone ArrowLeftRight) do menu de navegacao
- **PinAccess.tsx**: Sem alteracoes (ja redireciona para `/indicadores`)

---

## Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/pages/Indicadores.tsx` | Reescrever com Tabs: aba Gerais (conteudo atual) + aba Mensais (KPIs + graficos mensais) |
| `src/pages/Relatorios.tsx` | Adicionar 4a aba "Comparativo" com logica vinda de Comparativo.tsx |
| `src/App.tsx` | Remover rota `/comparativo` e import |
| `src/components/Layout.tsx` | Remover item Comparativo do menu |

### Componentes reutilizados
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` do Radix
- `recharts` (PieChart, BarChart, ResponsiveContainer) para graficos na aba Mensais
- `runAllChecks` de `@/lib/auditChecks` para resumo de auditoria
- `exportToPDF`, `exportToExcel` de `@/lib/exportUtils` para o comparativo
- `Table` components para o comparativo

