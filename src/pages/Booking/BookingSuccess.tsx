import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, CalendarCheck } from "lucide-react";

export const BookingSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in space-y-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-green-100/50">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>

            <div className="space-y-4 max-w-md">
                <h2 className="text-3xl font-bold text-slate-800">Agendamento Confirmado!</h2>
                <p className="text-slate-500 text-lg leading-relaxed">
                    Sua sessão de Shiatsu foi reservada com sucesso. Enviamos os detalhes para o seu e-mail.
                </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 w-full max-w-sm text-left space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                    Instruções
                </h3>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        Chegue com 5 minutos de antecedência.
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        Use roupas confortáveis para a massagem.
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        Em caso de desistência, cancele com 24h de antecedência.
                    </li>
                </ul>
            </div>

            <Button onClick={() => navigate("/")} size="lg" className="px-8 rounded-full bg-primary hover:bg-primary-dark">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
            </Button>
        </div>
    );
};
