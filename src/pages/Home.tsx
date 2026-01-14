import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { Calendar, Clock, Users, Heart, Info, ArrowRight, Shield } from "lucide-react";
export const Home = () => {
  const navigate = useNavigate();
  return <Layout>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url('/lovable-uploads/58badbf8-dd65-43ef-9e20-7cf00a2634a1.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-secondary-light/20 text-secondary-dark px-4 py-2 rounded-full text-sm font-medium">
            <Heart className="w-4 h-4" />
            Passaporte Saúde Ocyan
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold gradient-text leading-tight">Terapia Mente e Corpo</h1>
          <h2 className="text-2xl md:text-3xl text-foreground/80 font-medium">Seu momento de relaxamento começa aqui.</h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">Desfrute de sessões de shiatsu para promover seu bem-estar físico e mental. 
Um momento especial dedicado ao seu equilíbrio e relaxamento durante o dia de trabalho.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Button onClick={() => navigate("/agendar")} className="btn-hero min-w-64">
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Sessão
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button variant="outline" onClick={() => navigate("/regras")} className="btn-outline-primary min-w-64">
              <Info className="w-5 h-5 mr-2" />
              Regras de Uso
            </Button>
            
            <Button variant="outline" onClick={() => navigate("/cancelar")} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-w-64">
              Consultar/Cancelar Agendamento
            </Button>
          </div>
        </div>

        {/* Benefits Cards */}
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="card-gradient hover-lift border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Sessões de 20 minutos</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">Tempo ideal para relaxar e recarregar suas energias durante o dia</CardDescription>
            </CardContent>
          </Card>

          <Card className="card-gradient hover-lift border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-xl">Pausa na Rotina</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">Pequenas pausas, grandes impactos na sua qualidade de vida</CardDescription>
            </CardContent>
          </Card>

          <Card className="card-gradient hover-lift border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Terapeutas Qualificados</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                Profissionais qualificados em massoterapia para garantir o melhor atendimento
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Quick Info */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 animate-scale-in">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-foreground">
                Como funciona?
              </h3>
              <div className="grid md:grid-cols-4 gap-6 mt-8">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-white font-bold text-lg">
                    1
                  </div>
                  <p className="font-medium">Escolha data e horário</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-white font-bold text-lg">
                    2
                  </div>
                  <p className="font-medium">Valide seu cadastro</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-white font-bold text-lg">
                    3
                  </div>
                  <p className="font-medium">Confirme o agendamento</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto text-white font-bold text-lg">
                    ✓
                  </div>
                  <p className="font-medium">Receba confirmação e guarde o seu token</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Access */}
        <div className="text-center pt-8 border-t border-border/50">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/login")} 
            className="text-muted-foreground hover:text-foreground"
          >
            <Shield className="w-4 h-4 mr-2" />
            Área Administrativa
          </Button>
        </div>

      </div>
    </Layout>;
};