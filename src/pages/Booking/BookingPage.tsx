import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { API_URLS } from "@/lib/api-constants";
import { useToast } from "@/hooks/use-toast";

import { BookingLayout } from "./BookingLayout";
import { BookingCalendar } from "./BookingCalendar";
import { BookingSummary } from "./BookingSummary";
import { TimeSlotGrid, TimeSlot } from "./TimeSlotGrid";
import { BookingForm } from "./BookingForm";
import { BookingSuccess } from "./BookingSuccess";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewState = "TIME_SELECTION" | "FORM" | "SUCCESS";

export const BookingPage = () => {
    const { toast } = useToast();

    // -- State --
    const [view, setView] = useState<ViewState>("TIME_SELECTION");

    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [loadingDates, setLoadingDates] = useState(true);

    const [selectedDate, setSelectedDate] = useState<string>("");

    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string>("");

    const [cpf, setCpf] = useState("");
    const [nome, setNome] = useState("");
    const [loadingValidation, setLoadingValidation] = useState(false);

    // New state for gamification
    const [sessionCount, setSessionCount] = useState<number | null>(null);

    // Error Modal State
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorTitle, setErrorTitle] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const showErrorModal = (title: string, message: string) => {
        setErrorTitle(title);
        setErrorMessage(message);
        setIsErrorModalOpen(true);
    };

    // -- Effects --
    useEffect(() => {
        fetchAvailableDates();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchTimeSlots(selectedDate);
            setSelectedTime("");
            setView("TIME_SELECTION");
        }
    }, [selectedDate]);

    // Auto-fetch user details when CPF is complete (14 chars: 000.000.000-00)
    useEffect(() => {
        if (cpf.length === 14) {
            fetchUserStats(cpf);
        } else {
            // Reset if user clears CPF
            if (cpf.length < 11) {
                setNome("");
                setSessionCount(null);
            }
        }
    }, [cpf]);

    const fetchUserStats = async (cpfInput: string) => {
        const cpfLimpo = cpfInput.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) return;

        try {
            // 1. Validate CPF to get Name
            const valResponse = await fetch(API_URLS.VALIDAR_CPF, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cpfLimpo })
            });
            const valData = await valResponse.json();

            if (valData.habilitado && valData.nome) {
                setNome(valData.nome);

                // 2. Fetch Session Count (Gamification)
                // Using RPC consultar_agendamentos_cpf returns array. We count 'realizado' ones.
                const { data: history, error } = await supabase.rpc('consultar_agendamentos_cpf', {
                    cpf_busca: cpfLimpo
                });

                if (!error && history) {
                    // Count only 'realizado' status
                    const realizados = history.filter((a: any) => a.status === 'realizado').length;
                    setSessionCount(realizados);
                }
            } else {
                // Invalid or not found, maybe show error or just don't set nome
                // But don't block user from trying to click confirm (which validates again)
                // Actually, if we want to show the 'Identified' box, we rely on this.
            }
        } catch (error) {
            console.error("Error fetching user stats:", error);
        }
    };

    // -- Actions --

    const fetchAvailableDates = async () => {
        try {
            const { data, error } = await supabase
                .from('datas_disponiveis')
                .select('data')
                .eq('ativo', true)
                .order('data', { ascending: true });

            if (error) throw error;

            const timeZone = 'America/Sao_Paulo';
            const dates = data?.map(d => {
                const dataString = d.data;
                return toZonedTime(parseISO(dataString + 'T00:00:00'), timeZone);
            }) || [];

            setAvailableDates(dates);

            // Auto-select first available date if not selected
            /* 
            if (dates.length > 0 && !selectedDate) {
               setSelectedDate(format(dates[0], 'yyyy-MM-dd'));
            } 
            */
        } catch (error) {
            console.error('Erro ao buscar datas disponíveis:', error);
            showErrorModal("Erro ao Carregar Datas", "Não foi possível carregar as datas disponíveis. Por favor, tente novamente.");
        } finally {
            setLoadingDates(false);
        }
    };

    const fetchTimeSlots = async (date: string) => {
        setLoadingTimeSlots(true);
        try {
            const response = await fetch(`${API_URLS.HORARIOS_DISPONIVEIS}?data=${date}`, { method: 'GET' });
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

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setView("FORM");
    };

    const handleReset = () => {
        setSelectedDate("");
        setSelectedTime("");
        setCpf("");
        setNome("");
        setView("TIME_SELECTION");
        setTimeSlots([]);
    };

    const handleValidationAndSubmit = async () => {
        if (!selectedDate || !selectedTime || !cpf) return;

        setLoadingValidation(true);

        try {
            // 1. Validate CPF First
            const cpfLimpo = cpf.replace(/\D/g, '');
            const valResponse = await fetch(API_URLS.VALIDAR_CPF, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cpfLimpo })
            });
            const valData = await valResponse.json();

            if (!valData.habilitado) {
                showErrorModal(
                    "CPF não Habilitado",
                    "Seu CPF não foi encontrado em nossa base de dados ativa. Por favor, entre em contato imediatamente com a equipe de Saúde da Ocyan."
                );
                setLoadingValidation(false);
                return;
            }

            if (valData.nome) setNome(valData.nome);

            // 2. Create Appointment
            const bookResponse = await fetch(API_URLS.CRIAR_AGENDAMENTO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: valData.nome || nome,
                    cpf: cpfLimpo,
                    data: selectedDate,
                    horario: selectedTime
                })
            });

            const bookResult = await bookResponse.json();

            if (bookResponse.ok && bookResult.sucesso) {
                setView("SUCCESS");
                toast({
                    title: "Sucesso!",
                    description: "Seu agendamento foi realizado.",
                });
            } else {
                throw new Error(bookResult.error || 'Erro ao criar agendamento');
            }

        } catch (error) {
            console.error('Erro no processo de agendamento:', error);
            const msg = error instanceof Error ? error.message : "Erro desconhecido";

            if (msg.toLowerCase().includes("limite") && msg.toLowerCase().includes("semana")) {
                showErrorModal(
                    "Limite Atingido",
                    "Você já possui um agendamento nesta semana. Cancele o anterior se deseja remarcar."
                );
            } else {
                showErrorModal("Erro", msg);
            }
        } finally {
            setLoadingValidation(false);
        }
    };

    // -- Render Helpers --

    const renderLeftPanel = () => (
        <>
            <BookingCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                availableDates={availableDates}
                loading={loadingDates}
            />
            <BookingSummary
                date={selectedDate}
                time={selectedTime}
                cpfValid={!!nome} // Simple check if name was fetched or just simplify to step check
                onReset={handleReset}
            />
        </>
    );

    const renderRightPanel = () => {
        if (view === "SUCCESS") {
            return <BookingSuccess />;
        }

        if (view === "FORM") {
            return (
                <BookingForm
                    cpf={cpf}
                    nome={nome}
                    sessionCount={sessionCount}
                    onCpfChange={setCpf}
                    onConfirm={handleValidationAndSubmit}
                    loading={loadingValidation}
                />
            );
        }

        // Default: Time Selection
        return (
            <TimeSlotGrid
                timeSlots={timeSlots}
                selectedTime={selectedTime}
                onSelectTime={handleTimeSelect}
                loading={loadingTimeSlots}
            />
        );
    };

    return (
        <>
            <BookingLayout
                leftPanel={renderLeftPanel()}
                rightPanel={renderRightPanel()}
            />

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
        </>
    );
};
