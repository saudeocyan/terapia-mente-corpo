import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Clock, Shirt, Calendar, User, AlertTriangle, CheckCircle, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Rules = () => {
  const navigate = useNavigate();

  const rules = [
    {
      icon: Clock,
      title: "Pontualidade",
      description: "Compareça com 5 minutos de antecedência",
      details: "Isso garante que sua sessão comece no horário e não atrapalhe os próximos agendamentos.",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      icon: Shirt,
      title: "Vestimenta",
      description: "Use roupas leves e confortáveis",
      details: "Roupas soltas facilitam os movimentos do shiatsu e proporcionam maior conforto durante a sessão.",
      color: "text-teal-500",
      bg: "bg-teal-50"
    },
    {
      icon: Calendar,
      title: "Cancelamento",
      description: "Cancele com até 24h de antecedência",
      details: "Isso permite que outros integrantes possam aproveitar o horário disponível.",
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      icon: User,
      title: "Frequência",
      description: "Máximo de 1 agendamento por semana",
      details: "Assim garantimos que todos os integrantes tenham a oportunidade de usufruir do benefício.",
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    },
    {
      icon: AlertTriangle,
      title: "Não Comparecimento",
      description: "Faltas sem aviso podem restringir futuros agendamentos",
      details: "Para manter a qualidade do serviço, precisamos da colaboração de todos com os horários agendados.",
      color: "text-amber-500",
      bg: "bg-amber-50"
    }
  ];

  const goodPractices = [
    "Desligue ou coloque o celular no silencioso durante a sessão",
    "Informe ao terapeuta sobre qualquer desconforto ou condição médica",
    "Aproveite o momento para relaxar e desconectar do trabalho",
    "Hidrate-se bem antes e depois da sessão",
    "Evite refeições pesadas antes da sessão"
  ];

  return (
    <Layout>
      <div className="space-y-12 pb-12 animate-fade-in max-w-6xl mx-auto">

        {/* Header Section */}
        <div className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary-dark px-4 py-2 rounded-full text-sm font-medium animate-slide-up">
            <Shield className="w-4 h-4" />
            <span>Diretrizes e Normas</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-light tracking-tight text-slate-800 leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Regras de <span className="font-bold text-primary">Convivência</span>
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Para garantir a melhor experiência para todos os integrantes, estabelecemos algumas diretrizes simples.
            A colaboração de todos é fundamental para mantermos um ambiente harmonioso.
          </p>

          <div className="flex justify-center pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-slate-500 hover:text-primary hover:bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {rules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <Card key={index} className="border-0 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1 bg-white group h-full">
                <CardContent className="p-8 space-y-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300", rule.bg, "group-hover:bg-opacity-80")}>
                    <Icon className={cn("w-7 h-7", rule.color)} strokeWidth={1.5} />
                  </div>

                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-800 mb-2">{rule.title}</CardTitle>
                    <p className="text-sm font-medium text-slate-600 mb-3 block">
                      {rule.description}
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {rule.details}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Good Practices Section - Full Width Feature */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 lg:p-12 shadow-2xl animate-scale-in">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl opacity-30" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md">
                <Sparkles className="w-3 h-3" />
                <span>Dicas de Ouro</span>
              </div>
              <h2 className="text-3xl font-light">Boas Práticas para sua <br /><span className="font-bold text-primary-foreground">Sessão Perfeita</span></h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Aproveite cada segundo do seu momento. Pequenas atitudes fazem toda a diferença para o seu relaxamento.
              </p>

              <Button
                onClick={() => navigate("/agendar")}
                className="bg-white text-slate-900 hover:bg-slate-100 border-none h-12 px-8 rounded-xl font-medium mt-4 transition-transform hover:scale-105"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Agora
              </Button>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ul className="space-y-4">
                {goodPractices.map((practice, index) => (
                  <li key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-slate-200 text-sm lg:text-base font-light">{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};