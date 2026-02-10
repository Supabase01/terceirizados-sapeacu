

# Sistema de Auditoria de Folha de Pagamento

## Visão Geral
Sistema completo para auditoria de folha de pagamento de prefeituras, com dashboard visual, importação de dados Excel/CSV, análise comparativa de colaboradores e módulo de auditoria inteligente. Dados persistidos no Supabase externo com acesso protegido por PIN de 4 dígitos.

---

## 1. Tela de Acesso (PIN)
- Tela simples com input de 4 dígitos numéricos
- PIN armazenado no Supabase para validação
- Sem cadastro de usuários, apenas verificação do PIN
- Ao acertar, redireciona ao dashboard

## 2. Dashboard Geral (Tela Principal)
- **Cabeçalho** com nome da prefeitura (ex: Sapeaçu - BA) e período selecionado
- **4 Cards de Indicadores**: Total Bruto, Total Líquido, Quantidade de Funcionários, Ticket Médio
- **Gráfico de Barras** (Recharts): Evolução do custo total por mês
- **Gráfico de Linha**: Evolução do quadro de pessoal (colaboradores ativos por mês)
- **Cards de Comparação**: Impacto financeiro entre meses consecutivos (admissões, desligamentos, aumentos, reduções)
- **Tabela principal** listando todos os registros com paginação
- **Filtros Inteligentes**: Ano, Mês, Pasta/Secretaria, Busca por Nome/CPF — ao filtrar, cards e gráficos se atualizam instantaneamente

## 3. Comparativo Detalhado de Colaboradores
- Tela acessível ao clicar nos cards de comparação ou via navegação
- **Filtros**: Período (ex: Agosto vs Setembro), Tipo de Variação (Todos, Admissões, Desligamentos, Aumentos, Reduções, Sem Alteração), Busca por Nome/CPF
- **Tabela detalhada**: Nome, CPF, Bruto do mês anterior, Bruto do mês atual, Variação em R$ (com setas coloridas ↑↓), Variação em %
- Ordenação por maior variação absoluta

## 4. Importação de Dados
- Upload de arquivos Excel (.xlsx) e CSV
- Colunas obrigatórias: PREFEITURA, PASTA, ANO, MÊS, NOME, FUNÇÃO, CPF, BRUTO, LÍQUIDO
- Validação automática das colunas antes de salvar
- Parse dos dados e persistência no Supabase
- Indicador de progresso durante importação

## 5. Módulo de Auditoria (Diferencial)
- Aba ou modal dedicado com 4 verificações automáticas:
  - **Cruzamento de CPFs**: CPFs que receberam em pastas diferentes no mesmo mês
  - **Análise de Variação**: Colaboradores com aumento de líquido >20% em relação ao mês anterior
  - **Inconsistência de Valores**: Linhas onde Líquido = Bruto (ausência de retenções)
  - **Filtro de Fantasmas**: Nomes que aparecem em meses isolados sem recorrência
- Cada alerta exibido em card com indicador de severidade
- Possibilidade de filtrar por tipo de alerta

## 6. Exportações
- **Gerar PDF**: Exporta a visualização atual do dashboard (cards + gráficos) como relatório oficial
- **Exportar Excel**: Gera planilha com dados filtrados ou com os alertas de auditoria

## 7. Backend (Supabase Externo)
- Tabela para armazenar registros da folha de pagamento (campos: prefeitura, pasta, ano, mês, nome, função, cpf, bruto, líquido)
- Tabela de configuração para o PIN de acesso
- RLS policies adequadas para segurança dos dados

## 8. Estilo Visual
- Tema Slate/Zinc com Tailwind CSS (fiel às imagens)
- Fundo claro com cards arredondados e sombras suaves
- Cores de destaque: verde para positivo, vermelho para negativo
- Ícones com Lucide React
- Gráficos com Recharts (tooltips conforme imagens de referência)
- Layout responsivo

