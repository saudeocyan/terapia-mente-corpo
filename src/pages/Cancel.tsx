import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Search, Calendar, Clock, User, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Booking {
  id: string;
  data: string;
  horario: string;
  cpf_hash: string;
  nome: string;
  status: string;
}

export const Cancel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cpf, setCpf] = useState("");

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setIsErrorModalOpen(true);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const searchBookings = async () => {
    if (!cpf) {
      showErrorModal("Atenção", "Informe seu CPF para buscar agendamentos.");
      return;
    }
    setLoading(true);
    setSearched(false);
    try {
      const cpfLimpo = cpf.replace(/\D/g, "");

      const { data, error } = await supabase.rpc('consultar_agendamentos_cpf', {
        cpf_busca: cpfLimpo
      });

      if (error) throw error;

      // Type assertion or mapping might be needed if RPC data doesn't match perfectly, 
      // but assuming migration aligns with Updated Booking interface:
      setBookings((data as any[]) || []);
      setSearched(true);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos:", error);
      showErrorModal("Erro", error.message || "Erro ao buscar agendamentos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const cancelBooking = async () => {
    if (!selectedBooking) return;

    setLoading(true);
    setIsModalOpen(false);

    try {
      // Use the CPF from the input state for confirmation, as the DB one is hashed.
      const cpfLimpo = cpf.replace(/\D/g, "");

      const { data, error } = await supabase.rpc('cancelar_agendamento_usuario', {
        agendamento_id: selectedBooking.id,
        cpf_confirmacao: cpfLimpo
      });

      if (error) throw error;

      // Data response check depends on how the function returns generic JSON or not.
      // Assuming return type json { success: boolean, message?: string, error?: string }
      const result = data as any;

      if (!result.success) {
        throw new Error(result.error || "Não foi possível cancelar o agendamento.");
      }

      setBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id));
      setSelectedBooking(null);

      toast({
        title: "Agendamento cancelado",
        description: result.message || "Seu agendamento foi cancelado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao cancelar agendamento:", error);
      showErrorModal(
        "Erro ao Cancelar",
        error.message || "Não foi possível realizar o cancelamento.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-slide-up">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>

          <h1 className="text-4xl font-bold gradient-text my-0">Consultar Agendamentos</h1>
          <p className="text-lg text-muted-foreground">Consulte ou cancele aqui seus agendamentos realizados</p>
        </div>

        {/* Important Notice */}
        <Card className="border-destructive/20 bg-destructive/5 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground mb-2">Importante</h3>
                {/* AJUSTE: Textos atualizados para remover a menção ao token */}
                <ul className="space-y-1 text-sm text-foreground/90">
                  <li>
                    • Para cancelar um agendamento, basta buscá-lo com seu CPF e confirmar o cancelamento.
                  </li>
                  <li>• Você pode cancelar qualquer agendamento futuro através deste sistema.</li>
                  <li>• É permitido um agendamento por semana.</li>
                  <li>• Caso tenha dúvidas, entre em contato com a área da saúde.</li>
                  <li>• Faltas sem aviso podem restringir futuros agendamentos.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPF Search */}
        <Card className="card-gradient border-0 animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Search className="w-6 h-6 text-primary" />
              Buscar Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-cpf" className="text-base font-medium">
                Informe seu CPF para buscar seus agendamentos
              </Label>
              <div className="flex gap-3">
                <Input
                  id="search-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    if (formatted.length <= 14) {
                      setCpf(formatted);
                    }
                  }}
                  className="text-lg p-4 flex-1"
                  maxLength={14}
                  onKeyDown={(e) => e.key === "Enter" && searchBookings()}
                />
                <Button onClick={searchBookings} disabled={loading} className="btn-hero px-8">
                  {loading ? "Buscando..." : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="animate-slide-up">
            {bookings.length === 0 ? (
              <Card className="card-gradient border-0 text-center">
                <CardContent className="py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nenhum agendamento encontrado</h3>
                  <p className="text-muted-foreground mb-6">
                    Não encontramos agendamentos ativos para o CPF informado.
                  </p>
                  <Button onClick={() => navigate("/agendar")} className="btn-hero">
                    <Calendar className="w-4 h-4 mr-2" />
                    Fazer Novo Agendamento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Seus Agendamentos</h2>
                {bookings.map((booking) => (
                  <Card key={booking.id} className="card-gradient border-0 hover-lift">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Nome</p>
                              <p className="font-medium">{booking.nome}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Data</p>
                              <p className="font-medium">{formatDate(booking.data)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-secondary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Horário</p>
                              <p className="font-medium">{booking.horario}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <Button
                            onClick={() => handleOpenModal(booking)}
                            disabled={loading}
                            variant="destructive"
                            className="min-w-40"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Info */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold">Precisa de ajuda?</h3>
              <p className="text-muted-foreground">Caso tenha alguma dúvida, entre em contato com a área da saúde.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center"></div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Cancelamento */}
        <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                {/* AJUSTE: Mensagem simplificada */}
                <p>Você tem certeza que deseja cancelar esta sessão?</p>
                {selectedBooking && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {formatDate(selectedBooking.data)} às {selectedBooking.horario}
                    </p>
                  </div>
                )}
                {/* REMOVIDO: Bloco do input de token */}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedBooking(null);
                }}
              >
                Voltar
              </AlertDialogCancel>
              {/* AJUSTE: Botão de ação não está mais desabilitado */}
              <AlertDialogAction
                onClick={cancelBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de ERRO */}
        <AlertDialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive" />
                {errorTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsErrorModalOpen(false)}>Entendi</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};
