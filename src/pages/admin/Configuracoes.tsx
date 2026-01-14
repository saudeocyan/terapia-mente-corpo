import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Save, 
  Globe, 
  Mail,
  FileText,
  Shield
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const AdminConfiguracoes = () => {
  const { toast } = useToast();
  
  const [configuracoes, setConfiguracoes] = useState({
    textoInicial: `Bem-vindo ao sistema de agendamento de sessões de Shiatsu!

Aqui você pode agendar sua sessão de relaxamento e bem-estar. 

🌟 O que é Shiatsu?
Shiatsu é uma técnica terapêutica japonesa que utiliza pressão dos dedos, palmas das mãos e outras partes do corpo em pontos específicos para promover o equilíbrio energético e o bem-estar.

📋 Como funciona:
1. Verifique sua disponibilidade no calendário
2. Escolha o melhor horário para você
3. Preencha seus dados para confirmação
4. Receba a confirmação por e-mail

💆‍♀️ Benefícios do Shiatsu:
• Redução do stress e ansiedade
• Melhora da circulação sanguínea
• Alívio de tensões musculares
• Promoção do relaxamento profundo
• Equilíbrio energético do corpo`,

    regrasAgendamento: `📋 REGRAS E BOAS PRÁTICAS PARA AGENDAMENTO

⏰ HORÁRIOS E DISPONIBILIDADE
• As sessões funcionam de segunda a sexta-feira
• Horário de funcionamento: 9h às 16h
• Pausa para almoço: 12h às 13h
• Cada sessão tem duração de 20 minutos
• Intervalo de 5 minutos entre sessões

🎯 AGENDAMENTO
• Somente colaboradores com CPF habilitado podem agendar
• Máximo de 2 pessoas por horário
• Agendamento deve ser feito com pelo menos 2 horas de antecedência
• Reagendamento deve ser solicitado com 4 horas de antecedência

❌ CANCELAMENTOS
• Cancelamentos podem ser feitos até 2 horas antes da sessão
• Cancelamentos de última hora podem resultar em restrições futuras
• No-show (não comparecimento) será registrado no sistema

✅ COMPROMISSOS DO PARTICIPANTE
• Chegar com 5 minutos de antecedência
• Usar roupas confortáveis
• Informar condições de saúde relevantes
• Respeitar o horário agendado

📱 CONFIRMAÇÕES
• Confirmação será enviada por e-mail após o agendamento
• Lembrete será enviado 1 dia antes da sessão
• Em caso de dúvidas, entre em contato com a equipe de saúde`,

    emailConfirmacao: "saudeocyan@gmail.com",
    emailSupporte: "suporte.saude@ocyan.com",
    telefoneContato: "(11) 3000-0000",
    nomeEmpresa: "Ocyan - Programa de Bem-Estar"
  });

  const handleChange = (campo: keyof typeof configuracoes, valor: string) => {
    setConfiguracoes(prev => ({ ...prev, [campo]: valor }));
  };

  const salvarConfiguracoes = () => {
    // Aqui será integrado com Supabase
    toast({
      title: "Configurações salvas",
      description: "Todas as configurações foram atualizadas com sucesso.",
    });
  };

  const resetarConfiguracoes = () => {
    // Implementar reset para valores padrão
    toast({
      title: "Configurações resetadas",
      description: "As configurações foram restauradas para os valores padrão.",
    });
  };

  return (
    <AdminLayout title="Configurações Gerais">
      <div className="space-y-6">
        {/* Texto da Página Inicial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Texto da Página Inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="texto-inicial">Conteúdo exibido na página inicial pública</Label>
              <Textarea
                id="texto-inicial"
                value={configuracoes.textoInicial}
                onChange={(e) => handleChange("textoInicial", e.target.value)}
                rows={12}
                className="resize-none"
                placeholder="Digite o texto que será exibido na página inicial..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este texto será exibido na página inicial para todos os usuários.
            </p>
          </CardContent>
        </Card>

        {/* Regras de Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Regras e Boas Práticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regras-agendamento">Regras de agendamento e boas práticas</Label>
              <Textarea
                id="regras-agendamento"
                value={configuracoes.regrasAgendamento}
                onChange={(e) => handleChange("regrasAgendamento", e.target.value)}
                rows={15}
                className="resize-none"
                placeholder="Digite as regras e boas práticas..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Estas regras serão exibidas na página de regras e na confirmação de agendamento.
            </p>
          </CardContent>
        </Card>

        {/* Configurações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configurações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email-confirmacao">E-mail de Confirmação</Label>
                <Input
                  id="email-confirmacao"
                  type="email"
                  value={configuracoes.emailConfirmacao}
                  onChange={(e) => handleChange("emailConfirmacao", e.target.value)}
                  placeholder="email@empresa.com"
                />
                <p className="text-xs text-muted-foreground">
                  E-mail usado para enviar confirmações de agendamento
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-suporte">E-mail de Suporte</Label>
                <Input
                  id="email-suporte"
                  type="email"
                  value={configuracoes.emailSupporte}
                  onChange={(e) => handleChange("emailSupporte", e.target.value)}
                  placeholder="suporte@empresa.com"
                />
                <p className="text-xs text-muted-foreground">
                  E-mail para dúvidas e suporte técnico
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone-contato">Telefone de Contato</Label>
                <Input
                  id="telefone-contato"
                  value={configuracoes.telefoneContato}
                  onChange={(e) => handleChange("telefoneContato", e.target.value)}
                  placeholder="(11) 0000-0000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nome-empresa">Nome da Empresa/Programa</Label>
                <Input
                  id="nome-empresa"
                  value={configuracoes.nomeEmpresa}
                  onChange={(e) => handleChange("nomeEmpresa", e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button variant="outline" onClick={resetarConfiguracoes}>
            Resetar para Padrão
          </Button>
          
          <Button onClick={salvarConfiguracoes} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Sistema de Agendamento de Shiatsu - Versão 1.0</p>
              <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};