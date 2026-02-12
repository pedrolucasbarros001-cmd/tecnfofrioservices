import { useEffect } from "react";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";

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
import ServiceDetailPage from "@/pages/ServiceDetailPage";
import BudgetPrintPage from "@/pages/BudgetPrintPage";
import PerfilPage from "@/pages/PerfilPage";
import PreferenciasPage from "@/pages/PreferenciasPage";
import NotFound from "@/pages/NotFound";
import ImportPage from "@/pages/ImportPage";

const queryClient = new QueryClient();

// Global error handler component
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      
      // Prevent the default browser error logging
      event.preventDefault();
      
      // Show user-friendly message
      toast.error("Ocorreu um erro inesperado. Por favor, tente novamente.");
    };

    // Handle general JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      
      // Prevent the default browser error logging (only in development to help debug)
      if (process.env.NODE_ENV === 'development') {
        // Allow React error boundary to catch it
        return;
      }
      
      event.preventDefault();
      toast.error("Ocorreu um erro inesperado. Por favor, tente novamente.");
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GlobalErrorHandler>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
              <OnboardingProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/tv-monitor" element={
                    <ProtectedRoute allowedRoles={['monitor']}>
                      <TVMonitorPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Print pages - outside AppLayout, handle own auth via session bridge */}
                  <Route path="/print/service/:serviceId" element={<ServicePrintPage />} />
                  <Route path="/print/tag/:serviceId" element={<ServiceTagPage />} />
                  <Route path="/print/budget/:budgetId" element={<BudgetPrintPage />} />
                  
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
                    <Route path="/importar" element={
                      <ProtectedRoute allowedRoles={['dono']}>
                        <ImportPage />
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
                    
                    {/* Universal service routes - accessible by any authenticated user */}
                    <Route path="/service/:serviceId" element={<ServiceConsultPage />} />
                    <Route path="/service-detail/:serviceId" element={<ServiceDetailPage />} />
                    
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
          </GlobalErrorHandler>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;