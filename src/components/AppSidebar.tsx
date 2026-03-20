import { useState } from 'react';
import { BarChart3, Upload, ShieldAlert, FileText, Users, Building2, Briefcase, MapPin, Settings, Shield, ChevronDown, Landmark, FolderKanban, PlusCircle, MinusCircle, ClipboardList, History, Map, Crown, FileSpreadsheet, Monitor, Percent, DollarSign, CheckCircle2, Tag } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAllowedRoutes } from '@/hooks/useUserRoles';
import { useUnidade } from '@/contexts/UnidadeContext';

const modules = [
  {
    label: 'Cadastros',
    icon: Users,
    items: [
      { title: 'Colaboradores', url: '/cadastro/colaboradores', icon: Users },
      { title: 'Secretarias', url: '/cadastro/secretarias', icon: Building2 },
      { title: 'Funções', url: '/cadastro/funcoes', icon: Briefcase },
      { title: 'Lotações', url: '/cadastro/lotacoes', icon: MapPin },
      { title: 'Encargos', url: '/cadastro/encargos', icon: Percent, padrao: 'padrao_02' },
    ],
  },
  {
    label: 'Folha de Pagamentos',
    icon: FileText,
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
      { title: 'Em Processamento', url: '/folha/processamento', icon: ClipboardList },
      { title: 'Processada', url: '/folha/processada', icon: CheckCircle2 },
      { title: 'Pagamento', url: '/folha/pagamento', icon: DollarSign },
      { title: 'Adicionais', url: '/folha/adicionais', icon: PlusCircle },
      { title: 'Descontos', url: '/folha/descontos', icon: MinusCircle },
      { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ],
  },
  {
    label: 'Auditoria',
    icon: ShieldAlert,
    items: [
      { title: 'Alertas', url: '/alertas', icon: ShieldAlert },
      { title: 'Log de Alterações', url: '/auditoria/log', icon: History },
      { title: 'Log do Sistema', url: '/auditoria/sistema', icon: Monitor },
    ],
  },
  {
    label: 'Importação',
    icon: Upload,
    items: [
      { title: 'Folha de Pagamento', url: '/import', icon: FileSpreadsheet },
      { title: 'Colaboradores', url: '/import/colaboradores', icon: Users },
    ],
  },
  {
    label: 'Administrador',
    icon: Settings,
    items: [
      { title: 'Configurações', url: '/admin/config', icon: Settings },
      { title: 'Instituições', url: '/admin/instituicoes', icon: Landmark },
      { title: 'Unidades de Folha', url: '/admin/unidades', icon: FolderKanban },
      { title: 'Cidades', url: '/admin/cidades', icon: Map },
      { title: 'Lideranças', url: '/admin/liderancas', icon: Crown },
    ],
  },
];

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { data: allowedRoutes } = useAllowedRoutes();
  const { unidadePadrao } = useUnidade();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const allowedSet = new Set(allowedRoutes?.map(r => r.route_path) || []);

  const visibleModules = modules
    .map(mod => ({
      ...mod,
      items: mod.items.filter(item => {
        if (!allowedSet.has(item.url)) return false;
        if ((item as any).padrao && (item as any).padrao !== unidadePadrao) return false;
        return true;
      }),
    }))
    .filter(mod => mod.items.length > 0);

  const handleMouseLeave = () => {
    setOpen(false);
    setOpenGroup(null);
  };

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-4">
          <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
              Gestão de Folha
            </span>
          )}
        </div>

        {visibleModules.map((mod) => {
          const isGroupActive = mod.items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url + '/'));
          const isOpen = openGroup === mod.label;

          return (
            <Collapsible
              key={mod.label}
              open={isOpen}
              onOpenChange={(open) => setOpenGroup(open ? mod.label : null)}
              className="group/collapsible px-2 mb-1"
            >
              <CollapsibleTrigger className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
                isGroupActive && 'text-sidebar-foreground'
              )}>
                <mod.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{mod.label}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
                  </>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu className="mt-1 ml-2">
                  {mod.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
