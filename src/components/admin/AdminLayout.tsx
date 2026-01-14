import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  BarChart3,
  Clock,
  Users,
  Download,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/admin/agenda", label: "Agenda", icon: Calendar },
  { path: "/admin/disponibilidade", label: "Disponibilidade", icon: Clock },
  { path: "/admin/cpfs", label: "CPFs Habilitados", icon: Users },
  { path: "/admin/lista-presenca", label: "Lista de Presença", icon: Users },
  { path: "/admin/exportar", label: "Exportar Dados", icon: Download },
  { path: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/admin/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro no logout",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-bold text-primary">Painel Administrativo</h1>
          </div>

          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};