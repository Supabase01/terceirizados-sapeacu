import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useCanAccessRoute } from "@/hooks/useUserRoles";
import { safeSession } from "@/lib/safeStorage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnidadeProvider, useUnidade } from "@/contexts/UnidadeContext";

// Páginas de entrada ficam no pacote inicial (acesso imediato)
import Auth from "./pages/Auth";
import PinAccess from "./pages/PinAccess";
import SelecionarUnidade from "./pages/SelecionarUnidade";
import Hub from "./pages/Hub";
import NotFound from "./pages/NotFound";

// Demais páginas são carregadas sob demanda
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Import = lazy(() => import("./pages/Import"));
const ImportColaboradores = lazy(() => import("./pages/ImportColaboradores"));
const Alertas = lazy(() => import("./pages/Alertas"));
const AdicionaisPage = lazy(() => import("./pages/Adicionais"));
const DescontosPage = lazy(() => import("./pages/Descontos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const RelatorioContracheque = lazy(() => import("./pages/RelatorioContracheque"));
const CadastroColaboradores = lazy(() => import("./pages/CadastroColaboradores"));
const CadastroSecretarias = lazy(() => import("./pages/CadastroSecretarias"));
const CadastroFuncoes = lazy(() => import("./pages/CadastroFuncoes"));
const CadastroLotacoes = lazy(() => import("./pages/CadastroLotacoes"));
const AdminConfig = lazy(() => import("./pages/AdminConfig"));
const CadastroInstituicoes = lazy(() => import("./pages/CadastroInstituicoes"));
const CadastroUnidades = lazy(() => import("./pages/CadastroUnidades"));
const CadastroCidades = lazy(() => import("./pages/CadastroCidades"));
const CadastroLiderancas = lazy(() => import("./pages/CadastroLiderancas"));
const FolhaProcessamento = lazy(() => import("./pages/FolhaProcessamento"));
const FolhaProcessada = lazy(() => import("./pages/FolhaProcessada"));
const CadastroEncargos = lazy(() => import("./pages/CadastroEncargos"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const LogSistema = lazy(() => import("./pages/LogSistema"));
const Pagamento = lazy(() => import("./pages/Pagamento"));
const CadastroRubricas = lazy(() => import("./pages/CadastroRubricas"));
const MinhaConta = lazy(() => import("./pages/MinhaConta"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <span className="text-muted-foreground">Carregando...</span>
  </div>
);


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
  const pinValid = safeSession.get('pin_validated') === 'true';
  if (!pinValid) return <Navigate to="/pin" replace />;
  return <>{children}</>;
};


const UnidadeGuard = ({ children }: { children: React.ReactNode }) => {
  const { unidadeId } = useUnidade();
  if (!unidadeId) return <Navigate to="/selecionar-unidade" replace />;
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

// Admin routes don't need UnidadeGuard
const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>
    <PinGuard>
      <RouteGuard>{children}</RouteGuard>
    </PinGuard>
  </AuthGuard>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>
    <PinGuard>
      <UnidadeGuard>
        <RouteGuard>{children}</RouteGuard>
      </UnidadeGuard>
    </PinGuard>
  </AuthGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UnidadeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>

            <Route path="/" element={<Auth />} />
            <Route path="/pin" element={<AuthGuard><PinAccess /></AuthGuard>} />
            <Route path="/selecionar-unidade" element={<AuthGuard><PinGuard><SelecionarUnidade /></PinGuard></AuthGuard>} />
            <Route path="/modulos" element={<AuthGuard><PinGuard><Hub /></PinGuard></AuthGuard>} />
            {/* Admin routes - no unidade required */}
            <Route path="/admin/config" element={<AdminRoute><AdminConfig /></AdminRoute>} />
            <Route path="/admin/instituicoes" element={<AdminRoute><CadastroInstituicoes /></AdminRoute>} />
            <Route path="/admin/unidades" element={<AdminRoute><CadastroUnidades /></AdminRoute>} />
            <Route path="/admin/cidades" element={<AdminRoute><CadastroCidades /></AdminRoute>} />
            <Route path="/admin/liderancas" element={<ProtectedRoute><CadastroLiderancas /></ProtectedRoute>} />
            {/* Protected routes - unidade required */}
            <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
            <Route path="/import/colaboradores" element={<ProtectedRoute><ImportColaboradores /></ProtectedRoute>} />
            <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
            <Route path="/auditoria/log" element={<AdminRoute><AuditLog /></AdminRoute>} />
            <Route path="/auditoria/sistema" element={<AdminRoute><LogSistema /></AdminRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/relatorios/contracheque" element={<ProtectedRoute><RelatorioContracheque /></ProtectedRoute>} />
            <Route path="/folha/processamento" element={<ProtectedRoute><FolhaProcessamento /></ProtectedRoute>} />
            <Route path="/folha/processada" element={<ProtectedRoute><FolhaProcessada /></ProtectedRoute>} />
            <Route path="/folha/pagamento" element={<ProtectedRoute><Pagamento /></ProtectedRoute>} />
            <Route path="/folha/adicionais" element={<ProtectedRoute><AdicionaisPage /></ProtectedRoute>} />
            <Route path="/folha/descontos" element={<ProtectedRoute><DescontosPage /></ProtectedRoute>} />
            <Route path="/frequencia" element={<ProtectedRoute><Frequencia /></ProtectedRoute>} />
            <Route path="/cadastro/colaboradores" element={<ProtectedRoute><CadastroColaboradores /></ProtectedRoute>} />
            <Route path="/cadastro/secretarias" element={<ProtectedRoute><CadastroSecretarias /></ProtectedRoute>} />
            <Route path="/cadastro/funcoes" element={<ProtectedRoute><CadastroFuncoes /></ProtectedRoute>} />
            <Route path="/cadastro/lotacoes" element={<ProtectedRoute><CadastroLotacoes /></ProtectedRoute>} />
            <Route path="/cadastro/encargos" element={<ProtectedRoute><CadastroEncargos /></ProtectedRoute>} />
            <Route path="/cadastro/rubricas" element={<ProtectedRoute><CadastroRubricas /></ProtectedRoute>} />
            <Route path="/minha-conta" element={<AuthGuard><PinGuard><MinhaConta /></PinGuard></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>

        </BrowserRouter>
      </UnidadeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
