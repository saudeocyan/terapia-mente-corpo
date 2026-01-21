import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_URLS } from "@/lib/api-constants";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Trash2, User, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Agendamento {
  id: string;
  nome: string;
  cpf_hash: string;
  data: string;
  horario: string;
  status: string;
}

type AgendaAgrupada = Record<string, Record<string, Agendamento[]>>;

export const AdminAgenda = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dataAtual, setDataAtual] = useState(new Date());
  const [todosAgendamentos, setTodosAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  // Substitua sua função fetchAgendamentos por esta:

  // RAZÃO DA MUDANÇA: Remover o token estático e usar o cookie de autenticação enviado pelo navegador.
  // Busca agendamentos diretamente usando o cliente Supabase via RLS
  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .neq("status", "cancelado") // Filtra no banco
        .order("data", { ascending: false })
        .order("horario", { ascending: false });

      if (error) {
        throw error;
      }

      setTodosAgendamentos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cancela agendamento diretamente no banco (trigger cuidará do log)
  const excluirAgendamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "cancelado" })
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({ title: "Sucesso", description: "Agendamento cancelado com sucesso." });
      fetchAgendamentos(); // Recarrega a lista
    } catch (error: any) {
      console.error("Erro ao cancelar agendamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar o agendamento.",
        variant: "destructive",
      });
    }
  };

  const navegarSemana = (direcao: "anterior" | "proximo") => {
    const novaData = new Date(dataAtual);
    novaData.setDate(dataAtual.getDate() + (direcao === "proximo" ? 7 : -7));
    setDataAtual(novaData);
  };

  const irParaHoje = () => setDataAtual(new Date());

  const agendaDaSemana = useMemo(() => {
    const inicio = startOfWeek(dataAtual, { weekStartsOn: 1 });
    const fim = endOfWeek(dataAtual, { weekStartsOn: 1 });
    const diasDaSemana = eachDayOfInterval({ start: inicio, end: fim });

    const agendaAgrupada: AgendaAgrupada = todosAgendamentos.reduce((acc, ag) => {
      const { data, horario } = ag;
      if (!acc[data]) acc[data] = {};
      const hora = horario.slice(0, 5);
      if (!acc[data][hora]) acc[data][hora] = [];
      acc[data][hora].push(ag);
      return acc;
    }, {} as AgendaAgrupada);

    return diasDaSemana.map((dia) => ({
      data: dia,
      agendamentos: agendaAgrupada[format(dia, "yyyy-MM-dd")] || {},
    }));
  }, [todosAgendamentos, dataAtual]);

  return (
    <AdminLayout title="Agenda Semanal">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navegarSemana("anterior")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold text-center min-w-[240px]">
                {format(startOfWeek(dataAtual, { weekStartsOn: 1 }), "d 'de' MMM", { locale: ptBR })} -{" "}
                {format(endOfWeek(dataAtual, { weekStartsOn: 1 }), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <Button variant="outline" size="icon" onClick={() => navegarSemana("proximo")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={irParaHoje}>Hoje</Button>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando agenda...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agendaDaSemana
              .filter(({ agendamentos }) => Object.keys(agendamentos).length > 0)
              .map(({ data: dia, agendamentos }) => (
                <Card key={dia.toString()} className={isSameDay(dia, new Date()) ? "border-primary border-2" : ""}>
                  <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{format(dia, "eeee, d 'de' MMMM", { locale: ptBR })}</span>
                      <Badge variant={isSameDay(dia, new Date()) ? "default" : "secondary"}>
                        {Object.values(agendamentos).flat().length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.keys(agendamentos).sort().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum agendamento para este dia.
                      </p>
                    ) : (
                      Object.entries(agendamentos)
                        .sort(([horaA], [horaB]) => horaA.localeCompare(horaB))
                        .map(([hora, lista]) => (
                          <div key={hora}>
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-primary" /> {hora}
                            </h4>
                            <div className="space-y-2 pl-6">
                              {lista.map((ag) => (
                                <div
                                  key={ag.id}
                                  className="text-sm p-2 rounded-md bg-secondary/50 flex justify-between items-center"
                                >
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{ag.nome}</span>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja cancelar o agendamento de <strong>{ag.nome}</strong> às{" "}
                                          <strong>{hora}</strong>? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => excluirAgendamento(ag.id)}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Confirmar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
