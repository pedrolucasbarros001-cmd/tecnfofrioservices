import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layouts/AppLayout";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import GeralPage from "@/pages/GeralPage";
import OficinaPage from "@/pages/OficinaPage";
import ClientesPage from "@/pages/ClientesPage";
import ServicosPage from "@/pages/ServicosPage";
import OrcamentosPage from "@/pages/OrcamentosPage";
import ColaboradoresPage from "@/pages/ColaboradoresPage";
import PerformancePage from "@/pages/PerformancePage";
import SecretaryConcluidosPage from "@/pages/secretary/SecretaryConcluidosPage";
import SecretaryDebitoPage from "@/pages/secretary/SecretaryDebitoPage";
import TechnicianWorkshopFlow from "@/pages/technician/TechnicianWorkshopFlow";
import TechnicianVisitFlow from "@/pages/technician/TechnicianVisitFlow";
import TechnicianInstallationFlow from "@/pages/technician/TechnicianInstallationFlow";
import TechnicianDeliveryFlow from "@/pages/technician/TechnicianDeliveryFlow";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Owner routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orcamentos" element={<OrcamentosPage />} />
              <Route path="/colaboradores" element={<ColaboradoresPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              
              {/* Owner + Secretary routes */}
              <Route path="/geral" element={<GeralPage />} />
              <Route path="/oficina" element={<OficinaPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/concluidos" element={<SecretaryConcluidosPage />} />
              <Route path="/em-debito" element={<SecretaryDebitoPage />} />
              
              {/* Technician routes */}
              <Route path="/servicos" element={<ServicosPage />} />
              <Route path="/perfil" element={<PlaceholderPage />} />
              <Route path="/technician/workshop/:serviceId" element={<TechnicianWorkshopFlow />} />
              <Route path="/technician/visit/:serviceId" element={<TechnicianVisitFlow />} />
              <Route path="/technician/installation/:serviceId" element={<TechnicianInstallationFlow />} />
              <Route path="/technician/delivery/:serviceId" element={<TechnicianDeliveryFlow />} />
              
              {/* Shared routes */}
              <Route path="/preferencias" element={<PlaceholderPage />} />
            </Route>
            
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
