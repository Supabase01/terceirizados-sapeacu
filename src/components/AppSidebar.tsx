import { BarChart3, Upload, ShieldAlert, FileText, Users, Building2, Briefcase, MapPin, Settings, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const modules = [
  {
    label: 'Administrador',
    items: [
      { title: 'Configurações', url: '/admin/config', icon: Settings },
    ],
  },
  {
    label: 'Folha de Pagamentos',
    items: [
      { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
      { title: 'Importar', url: '/import', icon: Upload },
      { title: 'Relatórios', url: '/relatorios', icon: FileText },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { title: 'Colaboradores', url: '/cadastro/colaboradores', icon: Users },
      { title: 'Secretarias', url: '/cadastro/secretarias', icon: Building2 },
      { title: 'Funções', url: '/cadastro/funcoes', icon: Briefcase },
      { title: 'Lotações', url: '/cadastro/lotacoes', icon: MapPin },
    ],
  },
  {
    label: 'Auditoria',
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
        {/* Logo / brand */}
        <div className="flex items-center gap-2 px-4 py-4">
          <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
              Gestão de Folha
            </span>
          )}
        </div>

        {modules.map((mod) => {
          const isGroupActive = mod.items.some((i) => location.pathname === i.url);

          return (
            <SidebarGroup key={mod.label} defaultOpen={isGroupActive}>
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] tracking-wider">
                {!collapsed && mod.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
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
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
