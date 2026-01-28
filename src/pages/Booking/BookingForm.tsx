import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, AlertCircle, ArrowRight, Loader2, Award, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingFormProps {
    cpf: string;
    nome?: string;
    sessionCount?: number | null;
    onCpfChange: (value: string) => void;
    onConfirm: () => void;
    loading: boolean;
}

export const BookingForm = ({ cpf, nome, sessionCount, onCpfChange, onConfirm, loading }: BookingFormProps) => {

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11); // Limit to 11 digits

        // Simple mask 000.000.000-00
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            .replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3")
            .replace(/(\d{3})(\d{3})/, "$1.$2");

        onCpfChange(value);
    };

    // Extract first name (capitalize first letter just in case)
    const firstName = nome ? nome.split(' ')[0].charAt(0).toUpperCase() + nome.split(' ')[0].slice(1).toLowerCase() : "";

    return (
        <div className="max-w-md mx-auto space-y-8 animate-fade-in pt-8">
            <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                    <User className="w-6 h-6 text-primary" />
                    Identificação
                </h3>
                <p className="text-slate-500">
                    Informe seu CPF para confirmarmos sua elegibilidade.
                </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-soft border border-slate-100 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-slate-700 font-medium">CPF do Integrante</Label>
                        <div className="relative">
                            <Input
                                id="cpf"
                                placeholder="000.000.000-00"
                                value={cpf}
                                onChange={handleCpfChange}
                                className="h-12 text-lg tracking-wide border-slate-200 focus:ring-primary focus:border-primary pl-4"
                                maxLength={14}
                            />
                        </div>
                    </div>

                    {nome && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Identity Box */}
                            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 flex items-start gap-3">
                                <User className="w-5 h-5 text-secondary mt-0.5" />
                                <div>
                                    <p className="text-xs text-secondary-dark uppercase font-bold tracking-wider">Integrante Identificado</p>
                                    <p className="text-lg font-medium text-slate-800">{firstName} {nome.split(' ').slice(1).join(' ')}</p>
                                </div>
                            </div>

                            {/* Gamification / Stats Component (Migrated) */}
                            <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                    sessionCount && sessionCount > 0 ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary")}>
                                    {sessionCount && sessionCount > 0 ? <Award className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                                        Bem-vindo(a), {firstName}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {sessionCount === null || sessionCount === undefined
                                            ? "Sua jornada de bem-estar"
                                            : sessionCount === 0
                                                ? "Agende sua primeira sessão"
                                                : `Você já realizou ${sessionCount} sessões`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <Button
                            onClick={onConfirm}
                            disabled={loading || cpf.length < 14}
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary-dark hover:to-primary text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    Confirmar Agendamento
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 max-w-sm mx-auto">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 leading-relaxed">
                    <strong>Lembrete:</strong> Cada integrante pode agendar apenas uma sessão por semana. Isso garante que todos tenham oportunidade de participar.
                </p>
            </div>
        </div>
    );
};
