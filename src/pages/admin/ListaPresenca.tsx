import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_URLS } from "@/lib/api-constants"; // AJUSTE: Importar hook
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Printer, Download, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Agendamento {
  id: string;
  nome: string;
  horario: string;
  data: string;
  status: string;
}

interface ConfigDisponibilidade {
  hora_inicio: string;
  hora_fim: string;
  duracao_sessao: number;
  intervalo: number;
  vagas_por_horario: number;
  pausa_almoco_ativa: boolean;
  pausa_almoco_inicio: string;
  pausa_almoco_fim: string;
}

export const ListaPresenca = () => {
  const navigate = useNavigate(); // AJUSTE: Inicializar hook
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [config, setConfig] = useState<ConfigDisponibilidade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A ordem aqui é importante: primeiro as configs, depois os agendamentos.
    const loadData = async () => {
      setLoading(true);
      await fetchConfig();
      await fetchAgendamentos();
      setLoading(false);
    };
    loadData();
  }, [selectedDate]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_disponibilidade")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfig(data || null);
    } catch (error: any) {
      console.error("Erro ao buscar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
      navigate("/admin/login");
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const dataFormatada = format(selectedDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("data", dataFormatada)
        .eq("status", "confirmado")
        .order("horario", { ascending: true });

      if (error) throw error;

      setAgendamentos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar agendamentos:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
      // Opcional: só redirecionar se o erro for de autenticação (401), mas com supabase-js geralmente o erro é tratado
    }
  };

  const agendamentosDoDia = agendamentos;

  const agendaMap = useMemo(() => {
    const map = new Map<string, string[]>();
    agendamentosDoDia.forEach((ag) => {
      const key = (ag.horario || "").slice(0, 5);
      const arr = map.get(key) || [];
      arr.push(ag.nome);
      map.set(key, arr);
    });
    return map;
  }, [agendamentosDoDia]);

  const handlePrint = () => {
    // Criamos uma janela limpa para montar o documento oficial
    const printWindow = window.open("", "_blank");

    // DEFINIÇÃO DO DESIGN CORPORATIVO (CSS puro para impressão)
    const styles = `
      @page { size: A4 portrait; margin: 10mm; }
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
      
      body { 
        font-family: 'Inter', sans-serif; 
        color: #1e293b; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        margin: 0;
      }
      
      .container { max-width: 190mm; margin: 0 auto; }
      
      /* Cabeçalho */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #009ebf; /* Azul destaque Ocyan */
        padding-bottom: 5mm;
        margin-bottom: 8mm;
      }
      .logo img { height: 45px; width: auto; }
      .title-block { text-align: right; }
      .doc-title { 
        font-size: 18pt; font-weight: 700; color: #0f172a; margin: 0; text-transform: uppercase; 
      }
      .doc-date { font-size: 10pt; color: #64748b; margin-top: 2mm; }

      /* Tabela */
      table { width: 100%; border-collapse: collapse; font-size: 10pt; }
      
      /* Cabeçalho da Tabela */
      thead th { 
        background-color: #f1f5f9; 
        color: #334155;
        border-bottom: 2px solid #cbd5e1;
        padding: 4mm;
        text-transform: uppercase;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      
      /* Alinhamentos */
      .th-time, .td-time { width: 15%; text-align: center; }
      .th-name, .td-name { width: 50%; text-align: left; padding-left: 5mm; }
      .th-sign, .td-sign { width: 35%; text-align: center; }

      /* Linhas */
      tbody tr { border-bottom: 1px solid #e2e8f0; }
      td { padding: 4mm 2mm; vertical-align: middle; }

      /* Destaque de Horário */
      .time-badge {
        background: #e0f2fe;
        color: #0284c7;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 700;
        font-size: 9pt;
      }

      /* Linha de Assinatura */
      .sign-line {
        border-bottom: 1px solid #94a3b8;
        width: 80%;
        margin: 0 auto;
        height: 8mm;
      }

      /* Rodapé */
      .footer {
        position: fixed; bottom: 0; left: 0; right: 0;
        text-align: center; font-size: 8pt; color: #94a3b8;
        border-top: 1px solid #f1f5f9; padding-top: 2mm;
      }
    `;

    // GERAÇÃO DO CONTEÚDO
    const slots = formatTimeSlots();

    const tableRows = slots.length > 0 ? slots.map((time, index, arr) => {
      const occurrenceIndex = arr.slice(0, index).filter((t) => t === time).length;
      const participant = getParticipantForTime(time, occurrenceIndex);

      return `
        <tr>
          <td class="td-time">
            <span class="time-badge">${time}</span>
          </td>
          <td class="td-name">
            <strong>${participant || ""}</strong>
          </td>
          <td class="td-sign">
            <div class="sign-line"></div>
          </td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="3" style="text-align:center; padding:10mm; color:#64748b;">Nenhum horário configurado.</td></tr>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista de Presença - ${format(selectedDate, "dd/MM/yyyy")}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <img src="/lovable-uploads/835e1fa8-fc07-4a63-8846-ee304945053c.png" alt="Ocyan Logo" />
              </div>
              <div class="title-block">
                <h1 class="doc-title">Lista de Presença</h1>
                <div class="doc-date">
                  ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="th-time">Horário</th>
                  <th class="th-name">Colaborador</th>
                  <th class="th-sign">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="footer">
              Gerado automaticamente pelo Sistema Terapia Mente e Corpo • Ocyan
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow?.document.write(htmlContent);
    printWindow?.document.close();

    setTimeout(() => {
      printWindow?.print();
    }, 500);
  };

  const formatTimeSlots = () => {
    if (!config) return [];

    const slots = [];
    const [startHour, startMin] = config.hora_inicio.split(":").map(Number);
    const [endHour, endMin] = config.hora_fim.split(":").map(Number);
    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let lunchStart = 0,
      lunchEnd = 0;
    if (config.pausa_almoco_ativa) {
      const [lunchStartHour, lunchStartMin] = config.pausa_almoco_inicio.split(":").map(Number);
      const [lunchEndHour, lunchEndMin] = config.pausa_almoco_fim.split(":").map(Number);
      lunchStart = lunchStartHour * 60 + lunchStartMin;
      lunchEnd = lunchEndHour * 60 + lunchEndMin;
    }

    while (currentTime < endTime) {
      if (config.pausa_almoco_ativa && currentTime >= lunchStart && currentTime < lunchEnd) {
        currentTime = lunchEnd;
        continue;
      }

      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      for (let i = 0; i < config.vagas_por_horario; i++) {
        slots.push(timeString);
      }

      const nextTime = currentTime + config.duracao_sessao + config.intervalo;
      if (nextTime > endTime) break;
      if (config.pausa_almoco_ativa && currentTime < lunchStart && nextTime > lunchStart) {
        currentTime = lunchEnd;
        continue;
      }
      currentTime = nextTime;
    }
    return slots;
  };

  const getParticipantForTime = (time: string, occurrenceIndex: number) => {
    const names = agendaMap.get(time) || [];
    return names[occurrenceIndex] || "";
  };

  return (
    <AdminLayout title="Lista de Presença">
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row gap-8">
          <Card className="xl:w-1/3 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Selecionar Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
                locale={ptBR}
              />
            </CardContent>
          </Card>

          <Card className="xl:w-2/3 shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Lista de Presença - {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-3">
                <Button
                  onClick={handlePrint}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div id="lista-presenca" className="space-y-6">
                <div className="header flex flex-col items-center pb-8 border-b-2 border-gray-200 print:flex">
                  <div className="logo-section flex justify-center mb-6">
                    <img
                      src="/lovable-uploads/835e1fa8-fc07-4a63-8846-ee304945053c.png"
                      alt="Ocyan Logo"
                      className="logo h-20 w-auto"
                    />
                  </div>
                  <div className="document-info text-center">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Lista de Presença</h2>
                    <div className="date text-xl text-slate-600 font-medium">
                      {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-10">Carregando dados...</div>
                ) : (
                  <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                          <th className="px-6 py-4 text-center font-semibold text-sm uppercase tracking-wide border-r-2 border-slate-600">
                            Horário
                          </th>
                          <th className="px-6 py-4 text-center font-semibold text-sm uppercase tracking-wide border-r-2 border-slate-600">
                            Nome do Participante
                          </th>
                          <th className="px-6 py-4 text-center font-semibold text-sm uppercase tracking-wide">
                            Assinatura
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formatTimeSlots().length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-10 text-muted-foreground">
                              Nenhum horário disponível para este dia.
                            </td>
                          </tr>
                        ) : (
                          formatTimeSlots().map((time, index, arr) => {
                            const occurrenceIndex = arr.slice(0, index).filter((t) => t === time).length;
                            const participant = getParticipantForTime(time, occurrenceIndex);
                            return (
                              <tr
                                key={`${time}-${index}`}
                                className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors duration-200`}
                              >
                                <td
                                  className={`time-cell px-6 py-6 font-bold text-blue-700 text-center border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}
                                >
                                  {time}
                                </td>
                                <td className="participant-cell px-6 py-6 font-medium text-slate-800 text-center border-r-2 border-gray-200">
                                  {participant}
                                </td>
                                <td className="signature-cell px-6 py-6 relative min-h-[80px]">
                                  <div className="absolute bottom-3 left-6 right-6 border-b border-dotted border-gray-400"></div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};
