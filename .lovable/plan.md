

## Atualizar rotas faltantes no painel de permissões

### Problema
O array `ALL_ROUTES` em `AdminConfig.tsx` (linha 23-37) não inclui 4 rotas que existem no sistema:

| Rota | Modulo | Falta em ALL_ROUTES |
|------|--------|-------------------|
| `/admin/cidades` | Administrador | Sim |
| `/admin/liderancas` | Administrador | Sim |
| `/folha/processamento` | Folha de Pagamentos | Sim |
| `/auditoria/log` | Auditoria | Sim |

### Solução
Editar o array `ALL_ROUTES` em `src/pages/AdminConfig.tsx` (linhas 23-37) para adicionar as 4 rotas faltantes:

```typescript
const ALL_ROUTES = [
  { path: '/admin/config', module: 'Administrador', label: 'Painel Admin' },
  { path: '/admin/instituicoes', module: 'Administrador', label: 'Instituições' },
  { path: '/admin/unidades', module: 'Administrador', label: 'Unidades de Folha' },
  { path: '/admin/cidades', module: 'Administrador', label: 'Cidades' },
  { path: '/admin/liderancas', module: 'Administrador', label: 'Lideranças' },
  { path: '/indicadores', module: 'Folha de Pagamentos', label: 'Indicadores' },
  { path: '/import', module: 'Folha de Pagamentos', label: 'Importação' },
  { path: '/folha/processamento', module: 'Folha de Pagamentos', label: 'Em Processamento' },
  { path: '/folha/adicionais', module: 'Folha de Pagamentos', label: 'Adicionais' },
  { path: '/folha/descontos', module: 'Folha de Pagamentos', label: 'Descontos' },
  { path: '/relatorios', module: 'Folha de Pagamentos', label: 'Relatórios' },
  { path: '/cadastro/colaboradores', module: 'Cadastros', label: 'Colaboradores' },
  { path: '/cadastro/secretarias', module: 'Cadastros', label: 'Secretarias' },
  { path: '/cadastro/funcoes', module: 'Cadastros', label: 'Funções' },
  { path: '/cadastro/lotacoes', module: 'Cadastros', label: 'Lotações' },
  { path: '/alertas', module: 'Auditoria', label: 'Alertas' },
  { path: '/auditoria/log', module: 'Auditoria', label: 'Log de Alterações' },
];
```

### Escopo
- **1 arquivo editado**: `src/pages/AdminConfig.tsx` (apenas o array ALL_ROUTES)
- Sem alterações de banco de dados -- as permissões serão criadas dinamicamente pelo admin ao marcar checkboxes na matriz de permissões

