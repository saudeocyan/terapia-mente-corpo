import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, User, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo...",
        });

        // Pequeno delay para o toast aparecer
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1000);
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMessage = "Não foi possível realizar o login.";

      if (error.message === "Invalid login credentials") {
        errorMessage = "E-mail ou senha incorretos.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "E-mail não confirmado.";
      }

      toast({
        title: "Erro de autenticação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center animate-fade-in relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 w-full max-w-6xl items-center">

          {/* Left Column: Form & Content */}
          <div className="space-y-8 px-4 lg:pl-8 order-2 lg:order-1">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="-ml-4 text-slate-500 hover:text-primary hover:bg-transparent group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Início
            </Button>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary-dark px-4 py-2 rounded-full text-sm font-medium animate-slide-up">
                <ShieldCheck className="w-4 h-4" />
                <span>Área Restrita</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-light tracking-tight text-slate-800 leading-[1.15]">
                Portal do <br />
                <span className="font-bold text-primary">Especialista</span>
              </h1>

              <p className="text-lg text-slate-500 max-w-md leading-relaxed">
                Acesso exclusivo da área de saúde
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 max-w-md bg-white/50 backdrop-blur-sm p-1 rounded-2xl">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600 font-medium ml-1">Email Corporativo</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@ocyan.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 rounded-2xl border-slate-200 bg-white/80 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all font-medium text-slate-700 text-base shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600 font-medium ml-1">Senha de Acesso</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 rounded-2xl border-slate-200 bg-white/80 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all font-medium text-slate-700 text-base shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 animate-spin" /> Acessando...
                    </span>
                  ) : (
                    "Acessar Portal"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Immersive Image */}
          <div className="hidden lg:block relative h-[650px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 order-1 lg:order-2 group">
            <div
              className="absolute inset-0 bg-cover bg-center transform group-hover:scale-105 transition-transform duration-[1.5s]"
              style={{ backgroundImage: "url('/lovable-uploads/58badbf8-dd65-43ef-9e20-7cf00a2634a1.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent mix-blend-multiply opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/40" />

            {/* Floating Info */}
            <div className="absolute bottom-12 left-12 right-12 text-white/95 space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold tracking-wide uppercase">Ambiente Seguro</span>
              </div>

              <div className="space-y-4">
                <blockquote className="text-2xl font-light leading-snug">
                  "O cuidado com quem cuida é fundamental para o sucesso de todos."
                </blockquote>
                <div className="h-1 w-20 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};