import { LayoutGrid, Shield, UserCog } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAllowedRoutes } from '@/hooks/useUserRoles';
import { useUnidade } from '@/contexts/UnidadeContext';
import { findModuleByPath } from '@/config/modules';

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { data: allowedRoutes } = useAllowedRoutes();
  const { unidadePadrao } = useUnidade();

  const allowedSet = new Set(allowedRoutes?.map(r => r.route_path) || []);
  const activeModule = findModuleByPath(location.pathname);

  const visibleItems = (activeModule?.items || []).filter(item => {
    if (!allowedSet.has(item.url)) return false;
    if (item.padrao && item.padrao !== unidadePadrao) return false;
    return true;
  });

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-4">
          <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
              Gerencial Folha
            </span>
          )}
        </div>

        {/* Botão Módulos — sempre visível */}
        <div className="px-2 mb-2">
          <button
            type="button"
            onClick={() => navigate('/modulos')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Módulos</span>}
          </button>
        </div>

        {activeModule && (
          <>
            {!collapsed && (
              <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                {activeModule.label}
              </div>
            )}
            <SidebarMenu className="px-2">
              {visibleItems.map((item) => (
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
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/minha-conta"
                end
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <UserCog className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Minha Conta</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
