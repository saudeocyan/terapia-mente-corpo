import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URLS } from "@/lib/api-constants"; // AJUSTE: Importar hook de navegação
import { useToast } from "@/hooks/use-toast"; // AJUSTE: Importar hook de toast
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, TrendingUp, CalendarDays, UserCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Agendamento {
  id: string;
  nome: string;
  cpf: string;
  data: string;
  horario: string;
  status: string;
  criado_em: string;
  area: string;
}

export const AdminDashboard = () => {
  const navigate = useNavigate(); // AJUSTE: Inicializar hook de navegação
  const { toast } = useToast(); // AJUSTE: Inicializar hook de toast
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [cpfsCount, setCpfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Buscar agendamentos diretamente do Supabase
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from("agendamentos")
          .select("*");

        if (agendamentosError) throw agendamentosError;
        setAgendamentos(agendamentosData || []);

        // 2. Buscar contagem de CPFs diretamente do Supabase
        const { count, error: cpfsError } = await supabase
          .from("cpf_habilitado")
          .select("*", { count: 'exact', head: true });

        if (cpfsError) throw cpfsError;
        setCpfsCount(count || 0);

      } catch (error: any) {
        console.error("Erro ao buscar dados do dashboard:", error);
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]); // Adicionado navigate e toast às dependências do useEffect

  // --- O RESTANTE DO CÓDIGO ABAIXO PERMANECE O MESMO ---

  // Calcular estatísticas baseadas nos dados reais
  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const totalAgendamentos = agendamentos.length;
  const agendamentosSemana = agendamentos.filter(
    (a) => new Date(a.data) >= inicioSemana && new Date(a.data) <= hoje,
  ).length;
  const agendamentosMes = agendamentos.filter((a) => new Date(a.data) >= inicioMes && new Date(a.data) <= hoje).length;

  // Top 10 usuários
  const top10Usuarios = Object.entries(
    agendamentos.reduce(
      (acc, a) => {
        const key = `${a.cpf}-${a.nome}`;
        if (!acc[key]) {
          acc[key] = { nome: a.nome, cpf: a.cpf, count: 0, lastDate: a.criado_em };
        }
        acc[key].count++;
        if (new Date(a.criado_em) > new Date(acc[key].lastDate)) {
          acc[key].lastDate = a.criado_em;
        }
        return acc;
      },
      {} as Record<string, { nome: string; cpf: string; count: number; lastDate: string }>,
    ),
  )
    .map(([_, user]) => user)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
    })
    .slice(0, 10);

  // Distribuição por área
  const distribuicaoPorArea = agendamentos.reduce(
    (acc, a) => {
      const area = a.area || "Sem área";
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dadosGraficoPizza = Object.entries(distribuicaoPorArea).map(([area, count]) => ({
    name: area,
    value: count,
  }));

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{loading ? "..." : totalAgendamentos}</div>
              <p className="text-xs text-muted-foreground">Desde o início</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{loading ? "..." : agendamentosSemana}</div>
              <p className="text-xs text-muted-foreground">Nesta semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{loading ? "..." : agendamentosMes}</div>
              <p className="text-xs text-muted-foreground">Neste mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPFs Habilitados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{loading ? "..." : cpfsCount}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Área e Cancelados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Área</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
              ) : dadosGraficoPizza.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados para exibir</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosGraficoPizza}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosGraficoPizza.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agendamentos Cancelados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {loading ? "..." : agendamentos.filter((a) => a.status === "cancelado").length}
              </div>
              <p className="text-xs text-muted-foreground">Total histórico</p>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Top 10 Usuários com Mais Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Carregando...</p>
              ) : top10Usuarios.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum usuário encontrado</p>
              ) : (
                top10Usuarios.map((usuario, index) => (
                  <div key={usuario.cpf} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{usuario.nome}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary">
                      {usuario.count} {usuario.count === 1 ? "agendamento" : "agendamentos"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
