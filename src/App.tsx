import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Booking } from "./pages/Booking";
import { Cancel } from "./pages/Cancel";
import { Rules } from "./pages/Rules";
import NotFound from "./pages/NotFound";
import { AdminLogin } from "./pages/admin/Login";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminAgenda } from "./pages/admin/Agenda";
import { AdminDisponibilidade } from "./pages/admin/Disponibilidade";
import { AdminCpfsHabilitados } from "./pages/admin/CpfsHabilitados";
import { ListaPresenca } from "./pages/admin/ListaPresenca";
import AdminExportarDados from "./pages/admin/ExportarDados";
import { AdminConfiguracoes } from "./pages/admin/Configuracoes";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agendar" element={<Booking />} />
          <Route path="/cancelar" element={<Cancel />} />
          <Route path="/regras" element={<Rules />} />
          
          {/* Rotas Administrativas */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/agenda" element={<ProtectedRoute><AdminAgenda /></ProtectedRoute>} />
          <Route path="/admin/disponibilidade" element={<ProtectedRoute><AdminDisponibilidade /></ProtectedRoute>} />
          <Route path="/admin/cpfs" element={<ProtectedRoute><AdminCpfsHabilitados /></ProtectedRoute>} />
          <Route path="/admin/lista-presenca" element={<ProtectedRoute><ListaPresenca /></ProtectedRoute>} />
          <Route path="/admin/exportar" element={<ProtectedRoute><AdminExportarDados /></ProtectedRoute>} />
          <Route path="/admin/configuracoes" element={<ProtectedRoute><AdminConfiguracoes /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
