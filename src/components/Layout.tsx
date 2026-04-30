import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Building2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useUnidade } from '@/contexts/UnidadeContext';
import { Badge } from '@/components/ui/badge';

const Layout = ({ children, hideSidebar = false }: { children: ReactNode; hideSidebar?: boolean }) => {
  const navigate = useNavigate();
  const { unidadeNome, clearUnidade } = useUnidade();

  const handleLogout = async () => {
    sessionStorage.removeItem('pin_validated');
    sessionStorage.removeItem('unidade_id');
    sessionStorage.removeItem('unidade_nome');
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleChangeUnidade = () => {
    clearUnidade();
    navigate('/selecionar-unidade');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!hideSidebar && <AppSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-3">
            <div className="flex items-center gap-2">
              {!hideSidebar && <SidebarTrigger className="ml-1" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/modulos')}
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Módulos</span>
              </Button>
              {unidadeNome && (
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent gap-1.5 max-w-[200px] truncate"
                  onClick={handleChangeUnidade}
                >
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{unidadeNome}</span>
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          <main className="flex-1 p-3 md:p-6 mx-auto max-w-7xl w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
