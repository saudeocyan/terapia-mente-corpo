import { Calendar, Clock, UserCheck, RefreshCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Button } from "@/components/ui/button";

interface BookingSummaryProps {
    date?: string;
    time?: string;
    cpfValid: boolean;
    onReset: () => void;
}

export const BookingSummary = ({ date, time, cpfValid, onReset }: BookingSummaryProps) => {
    const formattedDate = date ? format(toZonedTime(parseISO(date + 'T00:00:00'), 'America/Sao_Paulo'), "EEEE, d 'de' MMMM", { locale: ptBR }) : null;

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Resumo do Agendamento
                </h3>
                {(date || time) && (
                    <Button variant="ghost" size="icon" onClick={onReset} className="h-6 w-6 text-slate-400 hover:text-destructive" title="Reiniciar">
                        <RefreshCcw className="w-3 h-3" />
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {/* Step 1: Date */}
                <div className={`flex items-start gap-4 transition-opacity duration-300 ${!date ? 'opacity-30' : 'opacity-100'}`}>
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${date ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-300'}`}>
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Data</p>
                        <p className="font-semibold text-slate-800 capitalize">
                            {formattedDate || "Selecione uma data..."}
                        </p>
                    </div>
                </div>

                {/* Step 2: Time */}
                <div className={`flex items-start gap-4 transition-opacity duration-300 ${!time ? 'opacity-30' : 'opacity-100'}`}>
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${time ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-300'}`}>
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Horário</p>
                        <p className="font-semibold text-slate-800">
                            {time ? `${time}h` : "--:--"}
                        </p>
                    </div>
                </div>

                {/* Step 3: Identity */}
                <div className={`flex items-start gap-4 transition-opacity duration-300 ${!cpfValid ? 'opacity-30' : 'opacity-100'}`}>
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cpfValid ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-300'}`}>
                        <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                        <p className={`font-semibold ${cpfValid ? 'text-secondary' : 'text-slate-800'}`}>
                            {cpfValid ? "Identidade Confirmada" : "Aguardando..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-4">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                        style={{
                            width: cpfValid ? '100%' : time ? '66%' : date ? '33%' : '0%'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
