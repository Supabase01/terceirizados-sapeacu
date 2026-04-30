
## Objetivo
Reorganizar a navegação em torno de **Módulos** (blocos visuais na página principal). Cada módulo agrupa páginas relacionadas. Dentro de um módulo, a sidebar lateral atual continua funcionando, mas filtrada para mostrar somente as páginas daquele módulo, com um botão "Módulos" no topo para voltar ao Hub.

## Os 7 Módulos
Mantém-se a estrutura atual de grupos como módulos:

1. **Indicadores** — Dashboards e KPIs
2. **Cadastros** — Colaboradores, Secretarias, Funções, Lotações, Encargos, Rubricas
3. **Folha de Pagamentos** — Em Processamento, Processada, Pagamento, Adicionais, Descontos
4. **Relatórios** — Geração de relatórios
5. **Auditoria** — Alertas, Log de Alterações, Log do Sistema
6. **Importação** — Folha de Pagamento, Colaboradores
7. **Administrador** — Configurações, Instituições, Unidades, Cidades, Lideranças

## Fluxo de Navegação

```text
Login → PIN → Selecionar Unidade → /modulos (HUB)
                                       │
                                       ├─→ Clica "Cadastros"
                                       │      ↓
                                       │   /cadastro/colaboradores
                                       │   (sidebar mostra só itens de Cadastros
                                       │    + botão "← Módulos" no topo)
                                       │
                                       └─→ Clica "← Módulos" → volta ao /modulos
```

## Páginas e Componentes

### 1. Nova página `/modulos` (Hub)
- Grid responsivo de **cards** (3 colunas em desktop, 2 em tablet, 1 em mobile).
- Cada card exibe:
  - Ícone grande do módulo (já existem em `AppSidebar.tsx`)
  - Título do módulo
  - Breve descrição (1 linha)
  - Contador opcional de subpáginas disponíveis
- Cards filtrados por permissões (`useAllowedRoutes`) e por `padrao` da unidade — se o usuário não tem acesso a nenhuma página do módulo, o card não aparece.
- Ao clicar, navega para a **primeira subpágina permitida** daquele módulo.
- Header com nome da unidade ativa + saudação.

### 2. Refatorar `AppSidebar.tsx`
- Detectar o **módulo ativo** pela rota atual (mapeando rota → módulo via a estrutura `modules`).
- Renderizar **somente os itens daquele módulo** (sem o accordion de grupos).
- Topo da sidebar: botão **"← Módulos"** que navega para `/modulos`.
- Mantém:
  - Branding "Gerencial Folha"
  - Comportamento collapsible/hover atual
  - Footer "Minha Conta"
- Se a rota não pertencer a nenhum módulo (ex.: `/minha-conta`, `/selecionar-unidade`), sidebar mostra estado neutro com só o botão Módulos.

### 3. Atualizar `App.tsx` (rotas)
- Adicionar rota `/modulos` → componente `Hub`.
- Após selecionar unidade, redirecionar para `/modulos` em vez de `/indicadores`.
- Atualizar `SelecionarUnidade.tsx` (`handleSelect` → `navigate('/modulos')`).
- Rota `/` (raiz autenticada) também aponta para `/modulos`.

### 4. Estrutura compartilhada `src/config/modules.ts`
Extrair a constante `modules` de `AppSidebar.tsx` para um arquivo compartilhado, consumido tanto pelo Hub quanto pela Sidebar. Adicionar a cada módulo:
- `id` (slug: `indicadores`, `cadastros`, etc.)
- `description` (texto curto para o card do Hub)
- `color` (token semântico para destaque visual do card)

## Design (tokens semânticos)
- Cards do Hub: `bg-card`, `border-border`, hover com `border-primary/50` + leve elevação.
- Ícone do card em círculo `bg-primary/10 text-primary`.
- Botão "← Módulos" na sidebar: estilo discreto, `text-muted-foreground hover:text-foreground`, com separador abaixo.
- Tudo via tokens de `index.css` / `tailwind.config.ts` — sem cores hardcoded.

## Permissões e Multi-tenant
- Hub respeita `useAllowedRoutes()` — módulo aparece só se houver pelo menos 1 subpágina permitida.
- Filtro `padrao` (P01/P02) continua válido — Encargos some em P01.
- Sidebar contextual respeita as mesmas regras.

## Detalhes Técnicos

**Arquivos a criar:**
- `src/config/modules.ts` — definição compartilhada dos módulos
- `src/pages/Hub.tsx` — página `/modulos` com grid de cards
- `src/components/ModuleCard.tsx` — card individual do módulo

**Arquivos a editar:**
- `src/components/AppSidebar.tsx` — modo contextual (filtra por módulo ativo) + botão Módulos
- `src/App.tsx` — adicionar rota `/modulos`, ajustar rota raiz
- `src/pages/SelecionarUnidade.tsx` — redirect para `/modulos`
- `src/pages/Auth.tsx` — redirect pós-login para `/modulos` (se já tem unidade)

**Lógica de "módulo ativo" na sidebar:**
```ts
const activeModule = modules.find(m => 
  m.items.some(i => location.pathname.startsWith(i.url))
);
```

**Memória do projeto:** atualizar `mem://style/design-system` e `mem://style/sidebar-interacao` refletindo a nova arquitetura modular.

## Fora de escopo (não muda)
- Lógica de folha, cálculos, validações
- Permissões RBAC (continua route-based)
- Layout interno das páginas existentes
- Fluxo de PIN e seleção de unidade
