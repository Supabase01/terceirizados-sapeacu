import {
  BarChart3, Upload, ShieldAlert, FileText, Users, Building2, Briefcase, MapPin,
  Settings, Landmark, FolderKanban, PlusCircle, MinusCircle, ClipboardList, History,
  Map, Crown, FileSpreadsheet, Monitor, Percent, DollarSign, CheckCircle2, Tag,
  ClipboardCheck, Receipt,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleItem {
  title: string;
  url: string;
  icon: LucideIcon;
  padrao?: 'padrao_01' | 'padrao_02';
}

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  items: ModuleItem[];
  color?: string;
}

export const modules: ModuleDef[] = [
  {
    id: 'indicadores',
    label: 'Indicadores',
    description: 'Dashboards e visão geral da operação',
    icon: BarChart3,
    color: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-500/15',
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    description: 'Colaboradores, secretarias, funções e demais cadastros',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
    items: [
      { title: 'Colaboradores', url: '/cadastro/colaboradores', icon: Users },
      { title: 'Secretarias', url: '/cadastro/secretarias', icon: Building2 },
      { title: 'Funções', url: '/cadastro/funcoes', icon: Briefcase },
      { title: 'Lotações', url: '/cadastro/lotacoes', icon: MapPin },
      { title: 'Encargos', url: '/cadastro/encargos', icon: Percent, padrao: 'padrao_02' },
      { title: 'Rubricas', url: '/cadastro/rubricas', icon: Tag },
    ],
  },
  {
    id: 'folha',
    label: 'Folha de Pagamentos',
    description: 'Processamento, fechamento e pagamento da folha',
    icon: FileText,
    color: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/15',
    items: [
      { title: 'Em Processamento', url: '/folha/processamento', icon: ClipboardList },
      { title: 'Processada', url: '/folha/processada', icon: CheckCircle2 },
      { title: 'Pagamento', url: '/folha/pagamento', icon: DollarSign },
      { title: 'Adicionais', url: '/folha/adicionais', icon: PlusCircle },
      { title: 'Descontos', url: '/folha/descontos', icon: MinusCircle },
    ],
  },
  {
    id: 'frequencia',
    label: 'Controle de Frequência',
    description: 'Registro mensal da entrega da folha de frequência por colaborador',
    icon: ClipboardCheck,
    color: 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-500/15',
    items: [
      { title: 'Frequência mensal', url: '/frequencia', icon: ClipboardCheck },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    description: 'Geração e exportação de relatórios',
    icon: FileText,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15',
    items: [
      { title: 'Relatórios', url: '/relatorios', icon: FileText },
      { title: 'Contracheques', url: '/relatorios/contracheque', icon: Receipt },
    ],
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    description: 'Alertas, logs de alterações e do sistema',
    icon: ShieldAlert,
    color: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15',
    items: [
      { title: 'Alertas', url: '/alertas', icon: ShieldAlert },
      { title: 'Log de Alterações', url: '/auditoria/log', icon: History },
      { title: 'Log do Sistema', url: '/auditoria/sistema', icon: Monitor },
    ],
  },
  {
    id: 'importacao',
    label: 'Importação',
    description: 'Importar folhas e colaboradores em lote',
    icon: Upload,
    color: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/15',
    items: [
      { title: 'Folha de Pagamento', url: '/import', icon: FileSpreadsheet },
      { title: 'Colaboradores', url: '/import/colaboradores', icon: Users },
    ],
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Configurações, instituições, unidades e lideranças',
    icon: Settings,
    color: 'text-slate-600 bg-slate-200 dark:text-slate-300 dark:bg-slate-500/20',
    items: [
      { title: 'Configurações', url: '/admin/config', icon: Settings },
      { title: 'Instituições', url: '/admin/instituicoes', icon: Landmark },
      { title: 'Unidades de Folha', url: '/admin/unidades', icon: FolderKanban },
      { title: 'Cidades', url: '/admin/cidades', icon: Map },
      { title: 'Lideranças', url: '/admin/liderancas', icon: Crown },
    ],
  },
];

export function findModuleByPath(pathname: string): ModuleDef | undefined {
  return modules.find(m =>
    m.items.some(i => pathname === i.url || pathname.startsWith(i.url + '/'))
  );
}
