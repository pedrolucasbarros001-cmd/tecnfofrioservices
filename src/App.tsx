import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
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
import TechnicianOfficePage from "@/pages/technician/TechnicianOfficePage";
import TechnicianVisitFlow from "@/pages/technician/TechnicianVisitFlow";
import TechnicianInstallationFlow from "@/pages/technician/TechnicianInstallationFlow";
import TechnicianDeliveryFlow from "@/pages/technician/TechnicianDeliveryFlow";
import ServiceRedirect from "@/pages/technician/ServiceRedirect";
import ServiceConsultPage from "@/pages/ServiceConsultPage";
import TVMonitorPage from "@/pages/TVMonitorPage";
import ServicePrintPage from "@/pages/ServicePrintPage";
import ServiceTagPage from "@/pages/ServiceTagPage";
import PerfilPage from "@/pages/PerfilPage";
import PreferenciasPage from "@/pages/PreferenciasPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OnboardingProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/tv-monitor" element={<TVMonitorPage />} />
            
            {/* Print pages - protected but outside AppLayout */}
            <Route path="/print/service/:serviceId" element={
              <ProtectedRoute>
                <ServicePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/print/tag/:serviceId" element={
              <ProtectedRoute>
                <ServiceTagPage />
              </ProtectedRoute>
            } />
            
            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Owner-only routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['dono']}>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/orcamentos" element={
                <ProtectedRoute allowedRoles={['dono']}>
                  <OrcamentosPage />
                </ProtectedRoute>
              } />
              <Route path="/colaboradores" element={
                <ProtectedRoute allowedRoles={['dono']}>
                  <ColaboradoresPage />
                </ProtectedRoute>
              } />
              <Route path="/performance" element={
                <ProtectedRoute allowedRoles={['dono']}>
                  <PerformancePage />
                </ProtectedRoute>
              } />
              
              {/* Owner + Secretary routes */}
              <Route path="/geral" element={
                <ProtectedRoute allowedRoles={['dono', 'secretaria']}>
                  <GeralPage />
                </ProtectedRoute>
              } />
              <Route path="/oficina" element={
                <ProtectedRoute allowedRoles={['dono', 'secretaria']}>
                  <OficinaPage />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute allowedRoles={['dono', 'secretaria']}>
                  <ClientesPage />
                </ProtectedRoute>
              } />
              <Route path="/concluidos" element={
                <ProtectedRoute allowedRoles={['dono', 'secretaria']}>
                  <SecretaryConcluidosPage />
                </ProtectedRoute>
              } />
              <Route path="/em-debito" element={
                <ProtectedRoute allowedRoles={['dono', 'secretaria']}>
                  <SecretaryDebitoPage />
                </ProtectedRoute>
              } />
              
              {/* Technician routes */}
              <Route path="/servicos" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <ServicosPage />
                </ProtectedRoute>
              } />
              <Route path="/oficina-tecnico" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <TechnicianOfficePage />
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <PerfilPage />
                </ProtectedRoute>
              } />
              <Route path="/technician/visit/:serviceId" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <TechnicianVisitFlow />
                </ProtectedRoute>
              } />
              <Route path="/technician/installation/:serviceId" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <TechnicianInstallationFlow />
                </ProtectedRoute>
              } />
              <Route path="/technician/delivery/:serviceId" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <TechnicianDeliveryFlow />
                </ProtectedRoute>
              } />
              <Route path="/technician/service/:serviceId" element={
                <ProtectedRoute allowedRoles={['tecnico']}>
                  <ServiceRedirect />
                </ProtectedRoute>
              } />
              
              {/* Universal service route - accessible by any authenticated user */}
              <Route path="/service/:serviceId" element={<ServiceConsultPage />} />
              
              {/* Shared routes */}
              <Route path="/preferencias" element={<PreferenciasPage />} />
            </Route>
            
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
