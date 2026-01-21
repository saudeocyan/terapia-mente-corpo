import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
import { Calendar, Clock, User, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, Clock4, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { API_URLS } from "@/lib/api-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BookingStep = 1 | 2 | 3 | 4;
interface TimeSlot {
  time: string;
  available: number;
  total: number;
}
interface BookingData {
  date?: string;
  time?: string;
  cpf?: string;
  nome?: string;
}

export const Booking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [cpfValidationLoading, setCpfValidationLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // REMOVIDO: O estado do cancelToken foi removido daqui.
  // const [cancelToken, setCancelToken] = useState<string>("");

  const steps = ["Data/Hora", "CPF/Nome", "Confirmação", "Sucesso"];

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setIsErrorModalOpen(true);
  };

  const fetchTimeSlots = async (date: string) => {
    setLoadingTimeSlots(true);
    try {
      const response = await fetch(`${API_URLS.HORARIOS_DISPONIVEIS}?data=${date}`, {
        method: 'GET'
      });
      const data = await response.json();
      if (response.ok && data.horarios) {
        const slots = data.horarios.map((h: any) => ({
          time: h.horario,
          available: h.vagas_disponiveis,
          total: h.vagas_total
        }));
        setTimeSlots(slots);
      } else {
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  useEffect(() => {
    fetchAvailableDates();
  }, []);
  const fetchAvailableDates = async () => {
    try {
      const { data, error } = await supabase.from('datas_disponiveis').select('data').eq('ativo', true).order('data', {
        ascending: true
      });
      if (error) throw error;

      const timeZone = 'America/Sao_Paulo';
      const dates = data?.map(d => {
        const dataString = d.data;
        const dataCorreta = toZonedTime(parseISO(dataString + 'T00:00:00'), timeZone);
        return dataCorreta;
      }) || [];
      setAvailableDates(dates);
    } catch (error) {
      console.error('Erro ao buscar datas disponíveis:', error);
      showErrorModal("Erro ao Carregar Datas", "Não foi possível carregar as datas disponíveis. Por favor, tente novamente.");
    } finally {
      setLoadingDates(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    const timeZone = 'America/Sao_Paulo';
    const today = toZonedTime(new Date(), timeZone);
    today.setHours(0, 0, 0, 0);

    const checkDate = toZonedTime(date, timeZone);
    checkDate.setHours(0, 0, 0, 0);

    const isFuture = checkDate >= today;
    const isInList = availableDates.some(availableDate => {
      const availableCheckDate = toZonedTime(availableDate, timeZone);
      availableCheckDate.setHours(0, 0, 0, 0);
      return availableCheckDate.getTime() === checkDate.getTime();
    });
    return isFuture && isInList;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setBookingData(prev => ({ ...prev, date }));
    fetchTimeSlots(date);
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, time }));
  };

  const validateCPF = async (cpf: string) => {
    setCpfValidationLoading(true);
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      const response = await fetch(API_URLS.VALIDAR_CPF, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfLimpo })
      });
      const data = await response.json();
      if (data.habilitado && data.nome) {
        setBookingData(prev => ({ ...prev, nome: data.nome }));
      }
      setCpfValidationLoading(false);
      return data.habilitado;
    } catch (error) {
      console.error('Erro na validação de CPF:', error);
      setCpfValidationLoading(false);
      showErrorModal("Erro na Validação", "Não foi possível validar o CPF. Tente novamente.");
      return false;
    }
  };

  const handleStepNext = async () => {
    if (currentStep === 1) {
      if (!bookingData.date || !bookingData.time) {
        showErrorModal("Atenção", "Selecione uma data e horário para continuar.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!bookingData.cpf) {
        showErrorModal("Atenção", "Informe seu CPF para continuar.");
        return;
      }
      const validationResult = await validateCPF(bookingData.cpf);
      if (!validationResult) {
        showErrorModal(
          "CPF não Habilitado",
          "Seu CPF não foi encontrado em nossa base de dados ativa. Por favor, entre em contato imediatamente com a equipe de Saúde da Ocyan para regularizar seu cadastro."
        );
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      try {
        const cpfLimpo = bookingData.cpf?.replace(/\D/g, '') || '';
        const response = await fetch(API_URLS.CRIAR_AGENDAMENTO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: bookingData.nome || '',
            cpf: cpfLimpo,
            data: bookingData.date,
            horario: bookingData.time
          })
        });
        const result = await response.json();
        if (response.ok && result.sucesso) {

          // REMOVIDO: A lógica de salvar o cancel_token foi removida daqui.

          setCurrentStep(4);
          toast({
            title: "Agendamento realizado!",
            description: "Seu agendamento foi confirmado com sucesso."
          });
        } else {
          throw new Error(result.error || 'Erro ao criar agendamento');
        }
      } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        const errorMessage = error instanceof Error ? error.message : "Não foi possível confirmar seu agendamento. Tente novamente.";

        if (errorMessage.toLowerCase().includes("limite") && errorMessage.toLowerCase().includes("semana")) {
          showErrorModal(
            "Limite de Agendamento Atingido",
            "Você já possui um agendamento confirmado na semana escolhida. Caso queira alterar a data/horário da sua sessão, cancele a atual e agende novamente no novo horário."
          );
        } else {
          showErrorModal("Erro no Agendamento", errorMessage);
        }
      }
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep(prev => prev - 1 as BookingStep);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const goToPreviousMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  return <Layout className="booking-background min-h-screen">
    <div className="relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-slide-up">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>

          <h1 className="text-4xl font-bold gradient-text">
            Agendar Sessão de Shiatsu
          </h1>
          <p className="text-lg text-muted-foreground">
            Siga os passos abaixo para reservar seu momento de bem-estar
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="flex justify-between items-center px-4 md:px-12 relative animate-fade-in">
          {/* Connecting Line */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-muted -z-10" />

          {[1, 2, 3].map((step) => {
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;

            return (
              <div key={step} className="flex flex-col items-center bg-background px-2">
                <div
                  className={`
                     w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                     ${isActive ? 'bg-primary text-primary-foreground scale-110 shadow-lg ring-4 ring-primary/20' :
                      isCompleted ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}
                   `}
                >
                  {isCompleted ? '✓' : step}
                </div>
                <span className={`text-xs font-medium mt-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step === 1 ? 'Data' : step === 2 ? 'Identificação' : 'Confirmação'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            // ... (O JSX para a Etapa 1 continua o mesmo)
            <Card className="card-gradient border-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calendar className="w-6 h-6 text-primary" />
                  Escolha a Data e Horário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
                  {/* Calendar Section */}
                  <div className="p-6 border-r border-border/10">
                    <h3 className="text-lg font-medium mb-4 text-foreground">Selecione uma Data</h3>
                    <div className="space-y-3">
                      {/* Calendar Grid Header */}
                      <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground mb-2">
                        <div>Dom</div>
                        <div>Seg</div>
                        <div>Ter</div>
                        <div>Qua</div>
                        <div>Qui</div>
                        <div>Sex</div>
                        <div>Sáb</div>
                      </div>

                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const today = new Date();
                          const currentMonth = currentCalendarDate.getMonth();
                          const currentYear = currentCalendarDate.getFullYear();
                          const firstDay = new Date(currentYear, currentMonth, 1);
                          const lastDay = new Date(currentYear, currentMonth + 1, 0);
                          const startingDayOfWeek = firstDay.getDay();
                          const daysInMonth = lastDay.getDate();
                          const days = [];

                          for (let i = 0; i < startingDayOfWeek; i++) {
                            days.push(<div key={`empty-${i}`} className="h-10"></div>);
                          }

                          for (let day = 1; day <= daysInMonth; day++) {
                            const date = new Date(currentYear, currentMonth, day);
                            const timeZone = 'America/Sao_Paulo';
                            const dateString = formatInTimeZone(toZonedTime(date, timeZone), timeZone, 'yyyy-MM-dd');
                            const todayInBrazil = toZonedTime(today, timeZone);
                            const isToday = formatInTimeZone(date, timeZone, 'yyyy-MM-dd') === formatInTimeZone(todayInBrazil, timeZone, 'yyyy-MM-dd');
                            const isAvailable = !loadingDates && isDateAvailable(date);
                            const isSelected = selectedDate === dateString;
                            days.push(<button key={day} onClick={() => isAvailable && handleDateSelect(dateString)} disabled={!isAvailable} className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected ? 'bg-primary text-primary-foreground shadow-lg scale-105' : isAvailable ? 'hover:bg-primary/10 hover:text-primary bg-card border border-border hover:border-primary/30' : 'text-muted-foreground/50 cursor-not-allowed opacity-30 bg-muted/30 border border-muted hover:bg-muted/30'} ${isToday ? 'ring-2 ring-primary/20' : ''}`}>
                              {day}
                            </button>);
                          }
                          return days;
                        })()}
                      </div>

                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/10">
                        <div className="flex items-center gap-4">
                          <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="h-8 w-8 p-0">
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <div className="text-lg font-medium text-foreground min-w-[180px] text-center">
                            {currentCalendarDate.toLocaleDateString('pt-BR', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                          <Button variant="outline" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {loadingDates ? 'Carregando...' : `${availableDates.length} datas disponíveis`}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Time Slots Section */}
                  <div className="p-6 bg-muted/20">
                    <h3 className="text-lg font-medium mb-4 text-foreground">
                      {selectedDate ? <>Horários para {(() => {
                        const timeZone = 'America/Sao_Paulo';
                        const date = toZonedTime(parseISO(selectedDate + 'T00:00:00'), timeZone);
                        const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                        return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
                      })()}</> : 'Selecione uma data para ver os horários'}
                    </h3>
                    {selectedDate ? loadingTimeSlots ? (
                      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : timeSlots.length === 0 ? <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhum horário disponível para esta data</p>
                      </div>
                    </div> : <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {timeSlots.map((slot, index) => <button key={index} onClick={() => slot.available > 0 && handleTimeSelect(slot.time)} disabled={slot.available === 0} className={`w-full p-4 rounded-lg text-left transition-all duration-200 border relative overflow-hidden group ${slot.available === 0 ? 'border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50' : bookingData.time === slot.time ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-[1.02]' : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md'}`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${bookingData.time === slot.time ? 'text-primary-foreground' : 'text-primary'}`} />
                            <span className="font-bold text-lg">{slot.time.slice(0, 5)}</span>
                          </div>
                          <div className="text-xs">
                            {slot.available === 0 ? <span className="text-destructive font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Esgotado
                            </span> : <span className={`${bookingData.time === slot.time ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                              {slot.available} vagas
                            </span>}
                          </div>
                        </div>
                        {bookingData.time === slot.time && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>)}
                    </div> : <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Primeiro, selecione uma data no calendário</p>
                      </div>
                    </div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            // ... (O JSX para a Etapa 2 continua o mesmo)
            <Card className="card-gradient border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <User className="w-6 h-6 text-primary" />
                  Validação por CPF
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                  <p className="text-secondary-dark">
                    <strong>Informe seu CPF para validar seu agendamento.</strong><br />
                    Ele será verificado automaticamente em nossa base de integrantes.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-base font-medium">CPF</Label>
                    <Input id="cpf" type="text" placeholder="000.000.000-00" value={bookingData.cpf || ""} onChange={e => {
                      const formatted = formatCPF(e.target.value);
                      if (formatted.length <= 14) {
                        setBookingData(prev => ({
                          ...prev,
                          cpf: formatted
                        }));
                      }
                    }} className="text-lg p-4" maxLength={14} />
                  </div>
                  {bookingData.nome && <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Nome encontrado:</p>
                    <p className="font-medium text-secondary-dark">{bookingData.nome}</p>
                  </div>}
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-primary-dark">Lembrete Importante</p>
                      <p className="text-sm text-muted-foreground mt-1">Cada integrante pode agendar uma sessão por semana, para garantir que todos tenham acesso.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            // ... (O JSX para a Etapa 3 continua o mesmo)
            <Card className="card-gradient border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Clock4 className="w-6 h-6 text-secondary" />
                  Confirmar Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-6 space-y-4">
                  <h3 className="text-xl font-bold">Resumo do Agendamento</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-medium">
                          {bookingData.date && formatDate(new Date(bookingData.date + 'T00:00:00'))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Horário</p>
                        <p className="font-medium">{bookingData.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-secondary mt-0.5" />
                    <div>
                      <p className="font-medium text-secondary-dark">Só mais um clique e sua sessão estará agendada!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Após confirmar seu agendamento, enviaremos todos os detalhes por e-mail, incluindo instruções para o dia da sessão.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            // REMOVIDO: O Card de "Token de Cancelamento" foi removido desta etapa.
            <Card className="card-gradient border-0 text-center">
              <CardContent className="py-6 space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-secondary">Agendamento Realizado!</h2>
                  <p className="text-base text-muted-foreground max-w-md mx-auto">Sua sessão está confirmada</p>
                </div>

                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold">Próximos Passos</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>✓ Você receberá um e-mail com todos os detalhes</li>
                    <li>✓ Chegue com 5 minutos de antecedência</li>
                    <li>✓ Use roupas confortáveis</li>
                  </ul>
                </div>

                <Button onClick={() => navigate("/")} className="btn-hero">
                  Voltar ao Início
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleStepBack} disabled={currentStep === 1} className="min-w-32">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <Button onClick={handleStepNext} disabled={cpfValidationLoading} className="btn-hero min-w-32">
              {cpfValidationLoading ? "Validando..." : currentStep === 3 ? "Confirmar Agendamento" : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>

    {/* Modal de erro */}
    <AlertDialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{errorTitle}</AlertDialogTitle>
          <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setIsErrorModalOpen(false)}>
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Layout>;
};
