import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface TimeSlot {
    time: string;
    available: number;
    total: number;
}

interface TimeSlotGridProps {
    timeSlots: TimeSlot[];
    selectedTime: string | undefined;
    onSelectTime: (time: string) => void;
    loading: boolean;
}

export const TimeSlotGrid = ({ timeSlots, selectedTime, onSelectTime, loading }: TimeSlotGridProps) => {
    if (loading) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-700 flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (timeSlots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-lg font-medium">Nenhum horário disponível</p>
                <p className="text-sm">Selecione outra data no calendário.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-secondary" />
                    Horários Disponíveis
                </h3>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {timeSlots.filter(t => t.available > 0).length} opções
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {timeSlots.map((slot, index) => {
                    const isSelected = selectedTime === slot.time;
                    const isDisabled = slot.available === 0;

                    return (
                        <button
                            key={index}
                            onClick={() => !isDisabled && onSelectTime(slot.time)}
                            disabled={isDisabled}
                            className={cn(
                                "relative group flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 border-2",
                                isSelected
                                    ? "border-primary bg-primary text-white shadow-lg scale-105"
                                    : isDisabled
                                        ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                        : "border-slate-100 bg-white text-slate-600 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
                            )}
                        >
                            <span className="text-lg font-bold tracking-tight">
                                {slot.time.slice(0, 5)}
                            </span>

                            <div className="text-[10px] uppercase tracking-wide font-medium mt-1">
                                {isDisabled ? (
                                    <span className="text-rose-300 flex items-center gap-1">
                                        Esgotado
                                    </span>
                                ) : (
                                    <span className={isSelected ? "text-primary-foreground/80" : "text-green-600"}>
                                        {slot.available} Vagas
                                    </span>
                                )}
                            </div>

                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-secondary text-white rounded-full p-0.5 shadow-sm animate-scale-in">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
