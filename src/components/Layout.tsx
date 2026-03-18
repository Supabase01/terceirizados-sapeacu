import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

const Layout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    sessionStorage.removeItem('pin_validated');
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-3">
            <SidebarTrigger className="ml-1" />
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
