import { useState } from 'react';
import { BarChart3, Upload, ShieldAlert, FileText, Users, Building2, Briefcase, MapPin, Settings, Shield, ChevronDown } from 'lucide-react';
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

const modules = [
  {
    label: 'Administrador',
    icon: Settings,
    items: [
      { title: 'Configurações', url: '/admin/config', icon: Settings },
    ],
  },
  {
    label: 'Folha de Pagamentos',
    icon: FileText,
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
      { title: 'Importar', url: '/import', icon: Upload },
      { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ],
  },
  {
    label: 'Cadastros',
    icon: Users,
    items: [
      { title: 'Colaboradores', url: '/cadastro/colaboradores', icon: Users },
      { title: 'Secretarias', url: '/cadastro/secretarias', icon: Building2 },
      { title: 'Funções', url: '/cadastro/funcoes', icon: Briefcase },
      { title: 'Lotações', url: '/cadastro/lotacoes', icon: MapPin },
    ],
  },
  {
    label: 'Auditoria',
    icon: ShieldAlert,
    items: [
      { title: 'Alertas', url: '/alertas', icon: ShieldAlert },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4">
          <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
              Gestão de Folha
            </span>
          )}
        </div>

        {modules.map((mod) => {
          const isGroupActive = mod.items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url + '/'));

          return (
            <Collapsible key={mod.label} defaultOpen={isGroupActive} className="px-2 mb-1">
              <CollapsibleTrigger className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
                isGroupActive && 'text-sidebar-foreground'
              )}>
                <mod.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{mod.label}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=closed]:rotate-[-90deg]" />
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
