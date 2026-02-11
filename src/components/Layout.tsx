import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Upload, ShieldAlert, LogOut, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/indicadores', label: 'Indicadores', icon: BarChart3 },
  { href: '/import', label: 'Importar', icon: Upload },
  { href: '/alertas', label: 'Alertas', icon: ShieldAlert },
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Desktop header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm hidden md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground whitespace-nowrap">Auditoria de Folha</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 px-3 text-sm',
                    location.pathname === item.href && 'bg-secondary font-semibold'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-2 text-muted-foreground h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Mobile header - minimal */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm md:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Auditoria de Folha</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-3 md:p-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {navItems.map(item => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;