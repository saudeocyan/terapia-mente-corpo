import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Clock, Shirt, Calendar, User, AlertTriangle, CheckCircle } from "lucide-react";

export const Rules = () => {
  const navigate = useNavigate();

  const rules = [
    {
      icon: Clock,
      title: "Pontualidade",
      description: "Compareça com 5 minutos de antecedência",
      details: "Isso garante que sua sessão comece no horário e não atrapalhe os próximos agendamentos.",
      color: "text-primary"
    },
    {
      icon: Shirt,
      title: "Vestimenta",
      description: "Use roupas leves e confortáveis",
      details: "Roupas soltas facilitam os movimentos do shiatsu e proporcionam maior conforto durante a sessão.",
      color: "text-secondary"
    },
    {
      icon: Calendar,
      title: "Cancelamento",
      description: "Cancele com até 24h de antecedência",
      details: "Isso permite que outros colaboradores possam aproveitar o horário disponível.",
      color: "text-primary"
    },
    {
      icon: User,
      title: "Frequência",
      description: "Máximo de 1 agendamento por semana",
      details: "Assim garantimos que todos os colaboradores tenham a oportunidade de usufruir do benefício.",
      color: "text-secondary"
    },
    {
      icon: AlertTriangle,
      title: "Não Comparecimento",
      description: "Faltas sem aviso podem restringir futuros agendamentos",
      details: "Para manter a qualidade do serviço, precisamos da colaboração de todos com os horários agendados.",
      color: "text-destructive"
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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-slide-up">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          
          <h1 className="text-4xl font-bold gradient-text">
            Regras, Orientações e Boas Práticas
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Para garantir a melhor experiência para todos, seguimos algumas diretrizes importantes.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid gap-6 animate-fade-in">
          {rules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <Card key={index} className="card-gradient hover-lift border-0">
                <CardHeader className="flex flex-row items-start space-y-0 space-x-4 pb-4">
                  <div className={`p-3 rounded-lg bg-card ${rule.color.replace('text-', 'bg-')}/10`}>
                    <Icon className={`w-6 h-6 ${rule.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{rule.title}</CardTitle>
                    <CardDescription className="text-base font-medium text-foreground mt-1">
                      {rule.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-16">
                  <p className="text-muted-foreground">{rule.details}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Good Practices */}
        <Card className="bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20 animate-scale-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-secondary" />
              <div>
                <CardTitle className="text-2xl">Boas Práticas</CardTitle>
                <CardDescription className="text-base">
                  Dicas para aproveitar ao máximo sua sessão de shiatsu
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {goodPractices.map((practice, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{practice}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-4">Pronto para agendar?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Agora que você conhece todas as orientações, que tal reservar sua sessão de bem-estar?
            </p>
            <Button 
              onClick={() => navigate("/agendar")}
              className="btn-hero"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Minha Sessão
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};