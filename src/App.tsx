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
              <Route path="/orcamentos" element={<PlaceholderPage />} />
              <Route path="/colaboradores" element={<PlaceholderPage />} />
              
              {/* Owner + Secretary routes */}
              <Route path="/geral" element={<GeralPage />} />
              <Route path="/oficina" element={<OficinaPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/concluidos" element={<PlaceholderPage />} />
              <Route path="/em-debito" element={<PlaceholderPage />} />
              <Route path="/performance" element={<PlaceholderPage />} />
              
              {/* Technician routes */}
              <Route path="/servicos" element={<ServicosPage />} />
              <Route path="/perfil" element={<PlaceholderPage />} />
              
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
