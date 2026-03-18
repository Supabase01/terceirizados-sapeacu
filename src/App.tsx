import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PinAccess from "./pages/PinAccess";
import Indicadores from "./pages/Indicadores";
import Import from "./pages/Import";
import Alertas from "./pages/Alertas";
import Relatorios from "./pages/Relatorios";
import CadastroColaboradores from "./pages/CadastroColaboradores";
import CadastroSecretarias from "./pages/CadastroSecretarias";
import CadastroFuncoes from "./pages/CadastroFuncoes";
import CadastroLotacoes from "./pages/CadastroLotacoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isValidated = sessionStorage.getItem('pin_validated') === 'true';
  return isValidated ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PinAccess />} />
          <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
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
