import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BookingCalendarProps {
    selectedDate: string | undefined;
    onSelectDate: (date: string) => void;
    availableDates: Date[];
    loading: boolean;
}

export const BookingCalendar = ({ selectedDate, onSelectDate, availableDates, loading }: BookingCalendarProps) => {
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentCalendarDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const goToNextMonth = () => {
        setCurrentCalendarDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const isDateAvailable = (date: Date) => {
        const timeZone = "America/Sao_Paulo";
        const today = toZonedTime(new Date(), timeZone);
        today.setHours(0, 0, 0, 0);

        const checkDate = toZonedTime(date, timeZone);
        checkDate.setHours(0, 0, 0, 0);

        const isFuture = checkDate >= today;
        const isInList = availableDates.some((availableDate) => {
            const availableCheckDate = toZonedTime(availableDate, timeZone);
            availableCheckDate.setHours(0, 0, 0, 0);
            return availableCheckDate.getTime() === checkDate.getTime();
        });
        return isFuture && isInList;
    };

    const renderCalendarDays = () => {
        const today = new Date();
        const currentMonth = currentCalendarDate.getMonth();
        const currentYear = currentCalendarDate.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const days = [];

        // Empty slots for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const timeZone = "America/Sao_Paulo";
            const dateString = formatInTimeZone(toZonedTime(date, timeZone), timeZone, "yyyy-MM-dd");
            const todayInBrazil = toZonedTime(today, timeZone);

            const isToday =
                formatInTimeZone(date, timeZone, "yyyy-MM-dd") ===
                formatInTimeZone(todayInBrazil, timeZone, "yyyy-MM-dd");

            const isAvailable = !loading && isDateAvailable(date);
            const isSelected = selectedDate === dateString;

            days.push(
                <button
                    key={day}
                    onClick={() => isAvailable && onSelectDate(dateString)}
                    disabled={!isAvailable}
                    className={`
            h-10 w-10 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center relative
            ${isSelected
                            ? "bg-primary text-white shadow-md scale-110 ring-2 ring-primary-light"
                            : isAvailable
                                ? "bg-white hover:bg-primary/20 hover:text-primary text-slate-700 hover:scale-105 border border-slate-200"
                                : "text-slate-300 cursor-not-allowed bg-slate-50 border border-transparent"
                        }
            ${isToday && !isSelected ? "ring-1 ring-primary/40 font-bold text-primary" : ""}
          `}
                >
                    {day}
                    {isAvailable && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary/40 block"></span>
                    )}
                </button>
            );
        }
        return days;
    };

    return (
        <Card className="border-0 shadow-soft bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-primary">
                    <CalendarIcon className="w-5 h-5" />
                    Calendário
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="hover:bg-primary/10 text-primary">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-base font-semibold text-slate-700 capitalize">
                        {currentCalendarDate.toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                        })}
                    </div>
                    <Button variant="ghost" size="icon" onClick={goToNextMonth} className="hover:bg-primary/10 text-primary">
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    <div>D</div>
                    <div>S</div>
                    <div>T</div>
                    <div>Q</div>
                    <div>Q</div>
                    <div>S</div>
                    <div>S</div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 justify-items-center">
                    {renderCalendarDays()}
                </div>

                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span>Selecionada</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full border border-slate-300 bg-white"></div>
                        <span>Disponível</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-100"></div>
                        <span>Ocupada</span>
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px] rounded-lg">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
