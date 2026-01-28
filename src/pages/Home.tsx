import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { Calendar, CalendarX, Clock, Heart, Info, ArrowRight, Shield, Sparkles, Droplets, Leaf, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Home = () => {
  const navigate = useNavigate();
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    checkUserStats();
  }, []);

  const checkUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile name
        // @ts-ignore - profiles table exists in DB but not in types
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('nome')
          .eq('id', user.id)
          .single();

        if (profile?.nome) {
          setUserName(profile.nome.split(' ')[0]); // First name

          // Try to link profile -> cpf_habilitado -> agendamentos
          // Note: This relies on name matching which is a best-effort approach given current schema limitations (no direct user_id link in agendamentos)
          const { data: cpfData } = await supabase
            .from('cpf_habilitado')
            .select('cpf_hash')
            .eq('nome', profile.nome)
            .maybeSingle();

          if (cpfData?.cpf_hash) {
            const { count } = await supabase
              .from('agendamentos')
              .select('*', { count: 'exact', head: true })
              .eq('cpf_hash', cpfData.cpf_hash)
              .eq('status', 'realizado');

            setSessionCount(count || 0);
          } else {
            // Fallback: If we can't find by name match in cpf_habilitado, maybe try name match directly in agendamentos?
            // Or just show 0 if new user.
            setSessionCount(0);
          }
        }
      } else {
        setSessionCount(null); // Not logged in
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-16 pb-12 animate-fade-in">

        {/* Hero Section - Split View */}
        <section className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[80vh] lg:min-h-[600px]">

          {/* Left Column: Content */}
          <div className="space-y-8 order-2 lg:order-1 px-4 lg:pl-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary-dark px-4 py-2 rounded-full text-sm font-medium animate-slide-up">
                <Sparkles className="w-4 h-4" />
                <span>Passaporte Saúde Ocyan</span>
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-light tracking-tight text-slate-800 leading-[1.15]">
                Recarregue sua <br />
                <span className="font-bold text-primary">Energia Vital</span>
              </h1>

              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Um espaço dedicado ao seu equilíbrio. Desconecte-se da rotina e cuide do seu bem-estar físico e mental com nossas sessões de shiatsu.
              </p>
            </div>

            {/* Gamification / Stats Component */}
            {loadingStats ? (
              <div className="h-20 w-full bg-slate-50 animate-pulse rounded-xl" />
            ) : (
              <div className="bg-white/80 backdrop-blur-sm border border-slate-100 p-5 rounded-2xl shadow-soft flex items-center gap-5 max-w-md transform transition-all hover:scale-[1.02] duration-300">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                  sessionCount && sessionCount > 0 ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary")}>
                  {sessionCount && sessionCount > 0 ? <Award className="w-6 h-6" /> : <Leaf className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                    {userName ? `Bem-vindo(a), ${userName}` : "Jornada de Bem-Estar"}
                  </p>
                  <p className="text-lg font-semibold text-slate-800">
                    {sessionCount === null
                      ? "Comece sua jornada hoje"
                      : sessionCount === 0
                        ? "Agende sua primeira sessão"
                        : `Você já realizou ${sessionCount} sessões de autocuidado`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={() => navigate("/agendar")} className="btn-hero h-14 text-lg px-8 rounded-2xl group">
                <Calendar className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Agendar Sessão
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button variant="outline" onClick={() => navigate("/regras")} className="h-14 text-lg px-8 rounded-2xl border-2 border-slate-200 hover:border-primary hover:text-primary hover:bg-transparent transition-colors">
                Regras de Uso
              </Button>
            </div>

            <div className="pt-4 flex items-center gap-4 text-sm text-slate-400">
              <Button variant="link" onClick={() => navigate("/cancelar")} className="text-slate-600 hover:text-destructive p-0 h-auto font-medium text-base decoration-slate-300 underline-offset-4 hover:decoration-destructive transition-all">
                Consultar/Cancelar Agendamento
              </Button>
              <span>•</span>
              <Button variant="link" onClick={() => navigate("/admin/login")} className="text-slate-400 hover:text-primary p-0 h-auto font-normal">
                <Shield className="w-3 h-3 mr-1" />
                Área Administrativa
              </Button>
            </div>
          </div>

          {/* Right Column: Immersive Image */}
          <div className="order-1 lg:order-2 h-[400px] lg:h-[700px] relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 group">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent z-10 opacity-60 group-hover:opacity-50 transition-opacity duration-500" />
            <div
              className="absolute inset-0 bg-cover bg-center transform group-hover:scale-105 transition-transform duration-700"
              style={{
                backgroundImage: `url('/lovable-uploads/58badbf8-dd65-43ef-9e20-7cf00a2634a1.png')`
              }}
            />

            {/* Floating Badge on Image */}
            <div className="absolute bottom-10 left-10 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg max-w-xs animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-primary tracking-wider uppercase">Terapia Ocyan</span>
              </div>
              <p className="text-slate-700 font-medium text-sm leading-relaxed">
                "O equilíbrio entre corpo e mente é a chave para a alta performance sustentável."
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="grid md:grid-cols-3 gap-8 px-4">
          {[
            {
              icon: Clock,
              title: "Foco & Produtividade",
              desc: "20 minutos estratégicos para renovar sua atenção plena.",
              color: "text-blue-500",
              bg: "bg-blue-50"
            },
            {
              icon: Droplets, // representing relief/flow
              title: "Alívio de Tensão",
              desc: "Técnicas específicas para liberar nódulos de estresse.",
              color: "text-teal-500",
              bg: "bg-teal-50"
            },
            {
              icon: Leaf,
              title: "Redução de Estresse",
              desc: "Diminua os níveis de cortisol e aumente seu bem-estar.",
              color: "text-emerald-500",
              bg: "bg-emerald-50"
            }
          ].map((item, idx) => (
            <Card key={idx} className="border-0 shadow-sm hover:shadow-soft transition-all duration-300 hover:-translate-y-1 bg-white group">
              <CardContent className="p-8 text-center space-y-4">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-colors duration-300", item.bg, "group-hover:bg-opacity-80")}>
                  <item.icon className={cn("w-8 h-8", item.color)} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

      </div>
    </Layout>
  );
};