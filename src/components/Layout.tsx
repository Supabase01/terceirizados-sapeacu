import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, ShieldAlert, LogOut, TableProperties, ArrowLeftRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/detalhamento', label: 'Detalhamento', icon: TableProperties },
  { href: '/import', label: 'Importar', icon: Upload },
  { href: '/audit', label: 'Auditoria', icon: ShieldAlert },
  { href: '/comparativo', label: 'Comparativo', icon: ArrowLeftRight },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('pin_validated');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldAlert className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <span className="text-sm md:text-lg font-bold text-foreground whitespace-nowrap">Auditoria de Folha</span>
          </div>
          <nav className="flex items-center gap-0.5 md:gap-1 overflow-x-auto">
            {navItems.map(item => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 px-2 md:px-3 text-xs md:text-sm',
                    location.pathname === item.href && 'bg-secondary font-semibold'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-1 md:ml-2 text-muted-foreground h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
};

export default Layout;
