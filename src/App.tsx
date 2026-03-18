import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useCanAccessRoute } from "@/hooks/useUserRoles";
import Auth from "./pages/Auth";
import PinAccess from "./pages/PinAccess";
import Indicadores from "./pages/Indicadores";
import Import from "./pages/Import";
import Alertas from "./pages/Alertas";
import AdicionaisPage from "./pages/Adicionais";
import DescontosPage from "./pages/Descontos";
import Relatorios from "./pages/Relatorios";
import CadastroColaboradores from "./pages/CadastroColaboradores";
import CadastroSecretarias from "./pages/CadastroSecretarias";
import CadastroFuncoes from "./pages/CadastroFuncoes";
import CadastroLotacoes from "./pages/CadastroLotacoes";
import AdminConfig from "./pages/AdminConfig";
import CadastroInstituicoes from "./pages/CadastroInstituicoes";
import CadastroUnidades from "./pages/CadastroUnidades";
import FolhaProcessamento from "./pages/FolhaProcessamento";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PinGuard = ({ children }: { children: React.ReactNode }) => {
  const pinValid = sessionStorage.getItem('pin_validated') === 'true';
  if (!pinValid) return <Navigate to="/pin" replace />;
  return <>{children}</>;
};

const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { canAccess, isLoading } = useCanAccessRoute(location.pathname);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Verificando permissões...</span></div>;
  if (!canAccess) return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-3">
      <span className="text-lg font-medium text-muted-foreground">Acesso não autorizado</span>
      <span className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</span>
    </div>
  );
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>
    <PinGuard>
      <RouteGuard>{children}</RouteGuard>
    </PinGuard>
  </AuthGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/pin" element={<AuthGuard><PinAccess /></AuthGuard>} />
          <Route path="/admin/config" element={<ProtectedRoute><AdminConfig /></ProtectedRoute>} />
          <Route path="/admin/instituicoes" element={<ProtectedRoute><CadastroInstituicoes /></ProtectedRoute>} />
          <Route path="/admin/unidades" element={<ProtectedRoute><CadastroUnidades /></ProtectedRoute>} />
          <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          <Route path="/auditoria/log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
          <Route path="/folha/processamento" element={<ProtectedRoute><FolhaProcessamento /></ProtectedRoute>} />
          <Route path="/folha/adicionais" element={<ProtectedRoute><AdicionaisPage /></ProtectedRoute>} />
          <Route path="/folha/descontos" element={<ProtectedRoute><DescontosPage /></ProtectedRoute>} />
          <Route path="/cadastro/colaboradores" element={<ProtectedRoute><CadastroColaboradores /></ProtectedRoute>} />
          <Route path="/cadastro/secretarias" element={<ProtectedRoute><CadastroSecretarias /></ProtectedRoute>} />
          <Route path="/cadastro/funcoes" element={<ProtectedRoute><CadastroFuncoes /></ProtectedRoute>} />
          <Route path="/cadastro/lotacoes" element={<ProtectedRoute><CadastroLotacoes /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
