import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URLS } from "@/lib/api-constants";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, Save, Settings, CalendarDays } from "lucide-react";
import { format, isAfter, startOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
interface ConfigDisponibilidade {
  datasDisponiveis: Date[];
  datasExcluidas: Date[];
  horarios: {
    inicio: string;
    fim: string;
  };
  sessao: {
    duracao: number;
    intervalo: number;
    vagasPorHorario: number;
  };
  pausaAlmoco: {
    ativa: boolean;
    inicio: string;
    fim: string;
  };
}
export const AdminDisponibilidade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigDisponibilidade>({
    datasDisponiveis: [],
    datasExcluidas: [],
    horarios: {
      inicio: "09:00",
      fim: "16:00",
    },
    sessao: {
      duracao: 20,
      intervalo: 5,
      vagasPorHorario: 2,
    },
    pausaAlmoco: {
      ativa: true,
      inicio: "12:00",
      fim: "13:00",
    },
  });
  const [loading, setLoading] = useState(true);
  const [rangeSelection, setRangeSelection] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  useEffect(() => {
    carregarConfiguracoes();
  }, []);
  const carregarConfiguracoes = async () => {
    setLoading(true);
    try {
      // Busca configurações gerais
      const { data: configData, error: configError } = await supabase
        .from("configuracoes_disponibilidade")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configError) throw configError;

      // Busca datas disponíveis ativas
      const { data: datasData, error: datasError } = await supabase
        .from("datas_disponiveis")
        .select("data")
        .eq("ativo", true);

      if (datasError) throw datasError;

      const datasConvertidas = datasData?.map((d: any) => {
        // Ajuste para garantir que a data seja interpretada corretamente (evitar problemas de fuso)
        const [ano, mes, dia] = d.data.split("-");
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      }) || [];

      if (configData) {
        setConfig((prev) => ({
          ...prev,
          horarios: {
            inicio: configData.hora_inicio.slice(0, 5),
            fim: configData.hora_fim.slice(0, 5),
          },
          sessao: {
            duracao: configData.duracao_sessao,
            intervalo: configData.intervalo,
            vagasPorHorario: configData.vagas_por_horario,
          },
          pausaAlmoco: {
            ativa: configData.pausa_almoco_ativa || false,
            inicio: configData.pausa_almoco_inicio ? configData.pausa_almoco_inicio.slice(0, 5) : "12:00",
            fim: configData.pausa_almoco_fim ? configData.pausa_almoco_fim.slice(0, 5) : "13:00",
          },
          datasDisponiveis: datasConvertidas,
        }));
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (
    range:
      | {
        from: Date | undefined;
        to: Date | undefined;
      }
      | undefined,
  ) => {
    if (!range) {
      setRangeSelection({
        from: undefined,
        to: undefined,
      });
      setConfig((prev) => ({
        ...prev,
        datasDisponiveis: [],
        datasExcluidas: [],
      }));
      return;
    }
    setRangeSelection(range);
    if (range.from && range.to) {
      const allDatesInRange = eachDayOfInterval({
        start: range.from,
        end: range.to,
      });

      // Filtrar apenas segunda a sexta-feira (1-5) e excluir fins de semana
      const weekDaysOnly = allDatesInRange.filter((date) => {
        const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      });

      const availableDates = weekDaysOnly.filter(
        (date) => !config.datasExcluidas.some((excludedDate) => isSameDay(date, excludedDate)),
      );
      setConfig((prev) => ({
        ...prev,
        datasDisponiveis: availableDates,
      }));
    } else if (range.from) {
      const dayOfWeek = range.from.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        setConfig((prev) => ({
          ...prev,
          datasDisponiveis: [range.from!],
        }));
      } else {
        setConfig((prev) => ({
          ...prev,
          datasDisponiveis: [],
        }));
      }
    }
  };

  const handleDayClick = (date: Date) => {
    if (rangeSelection.from && rangeSelection.to && date >= rangeSelection.from && date <= rangeSelection.to) {
      const isExcluded = config.datasExcluidas.some((excludedDate) => isSameDay(date, excludedDate));
      if (isExcluded) {
        setConfig((prev) => ({
          ...prev,
          datasExcluidas: prev.datasExcluidas.filter((excludedDate) => !isSameDay(date, excludedDate)),
          datasDisponiveis: [...prev.datasDisponiveis, date].sort((a, b) => a.getTime() - b.getTime()),
        }));
      } else {
        setConfig((prev) => ({
          ...prev,
          datasExcluidas: [...prev.datasExcluidas, date],
          datasDisponiveis: prev.datasDisponiveis.filter((availableDate) => !isSameDay(date, availableDate)),
        }));
      }
    }
  };

  const handleHorarioChange = (tipo: "inicio" | "fim", valor: string) => {
    setConfig((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [tipo]: valor,
      },
    }));
  };

  const handleSessaoChange = (campo: keyof typeof config.sessao, valor: number) => {
    setConfig((prev) => ({
      ...prev,
      sessao: {
        ...prev.sessao,
        [campo]: valor,
      },
    }));
  };

  const handlePausaAlmocoChange = (campo: keyof typeof config.pausaAlmoco, valor: boolean | string) => {
    setConfig((prev) => ({
      ...prev,
      pausaAlmoco: {
        ...prev.pausaAlmoco,
        [campo]: valor,
      },
    }));
  };

  const salvarConfiguracoes = async () => {
    setLoading(true);
    try {
      // 1. Salvar configurações gerais
      const { data: currentConfig } = await supabase
        .from("configuracoes_disponibilidade")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (currentConfig?.id) {
        const { error: updateError } = await supabase
          .from("configuracoes_disponibilidade")
          .update({
            hora_inicio: config.horarios.inicio + ":00",
            hora_fim: config.horarios.fim + ":00",
            duracao_sessao: config.sessao.duracao,
            intervalo: config.sessao.intervalo,
            vagas_por_horario: config.sessao.vagasPorHorario,
            pausa_almoco_ativa: config.pausaAlmoco.ativa,
            pausa_almoco_inicio: config.pausaAlmoco.inicio + ":00",
            pausa_almoco_fim: config.pausaAlmoco.fim + ":00",
          })
          .eq("id", currentConfig.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova configuração se não existir
        const { error: insertError } = await supabase
          .from("configuracoes_disponibilidade")
          .insert([{
            hora_inicio: config.horarios.inicio + ":00",
            hora_fim: config.horarios.fim + ":00",
            duracao_sessao: config.sessao.duracao,
            intervalo: config.sessao.intervalo,
            vagas_por_horario: config.sessao.vagasPorHorario,
            pausa_almoco_ativa: config.pausaAlmoco.ativa,
            pausa_almoco_inicio: config.pausaAlmoco.inicio + ":00",
            pausa_almoco_fim: config.pausaAlmoco.fim + ":00"
          }]);

        if (insertError) throw insertError;
      }

      // 2. Salvar datas disponíveis
      if (config.datasDisponiveis.length > 0) {
        const datasParaInserir = config.datasDisponiveis.map(d => ({
          data: format(d, "yyyy-MM-dd"),
          ativo: true
        }));

        const { error: insertError } = await supabase
          .from("datas_disponiveis")
          .upsert(datasParaInserir, { onConflict: 'data' });

        if (insertError) throw insertError;
      }

      // Remover Datas Excluídas
      if (config.datasExcluidas.length > 0) {
        const datasExcluidasFormatadas = config.datasExcluidas.map(d => format(d, "yyyy-MM-dd"));
        const { error: deleteError } = await supabase
          .from("datas_disponiveis")
          .delete()
          .in("data", datasExcluidasFormatadas);

        if (deleteError) throw deleteError;
      }

      await carregarConfiguracoes();
      toast({
        title: "Configurações salvas",
        description: "As configurações de disponibilidade foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <AdminLayout title="Gerenciamento de Disponibilidade">
      <div className="space-y-6">
        {/* Calendário de Disponibilidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Selecionar Datas Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-center">
                <CalendarComponent
                  mode="range"
                  selected={rangeSelection}
                  onSelect={handleRangeChange}
                  onDayClick={handleDayClick}
                  disabled={(date) => {
                    const isInPast = isAfter(startOfDay(new Date()), startOfDay(date));
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // domingo ou sábado
                    return isInPast || isWeekend;
                  }}
                  className={cn("rounded-md border pointer-events-auto")}
                  numberOfMonths={2}
                  modifiers={{
                    excluded: config.datasExcluidas,
                  }}
                  modifiersClassNames={{
                    excluded: "bg-destructive/20 text-destructive line-through",
                  }}
                />
              </div>
            </div>
            {config.datasDisponiveis.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Datas selecionadas:</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {config.datasDisponiveis
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => (
                      <div
                        key={date.toISOString()}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                      >
                        {format(date, "dd/MM/yyyy")}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horario-inicio">Horário de Início</Label>
                <Input
                  id="horario-inicio"
                  type="time"
                  value={config.horarios.inicio}
                  onChange={(e) => handleHorarioChange("inicio", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario-fim">Horário de Fim</Label>
                <Input
                  id="horario-fim"
                  type="time"
                  value={config.horarios.fim}
                  onChange={(e) => handleHorarioChange("fim", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações da Sessão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Sessão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duracao">Duração da Sessão (minutos)</Label>
                <Input
                  id="duracao"
                  type="number"
                  value={config.sessao.duracao}
                  onChange={(e) => handleSessaoChange("duracao", parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intervalo">Intervalo entre Sessões (minutos)</Label>
                <Input
                  id="intervalo"
                  type="number"
                  value={config.sessao.intervalo}
                  onChange={(e) => handleSessaoChange("intervalo", parseInt(e.target.value))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vagas">Vagas por Horário</Label>
                <Input
                  id="vagas"
                  type="number"
                  value={config.sessao.vagasPorHorario}
                  onChange={(e) => handleSessaoChange("vagasPorHorario", parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pausa para Almoço */}
        <Card>
          <CardHeader>
            <CardTitle>Pausa para Almoço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pausa-ativa" className="text-sm font-medium">
                Ativar pausa para almoço
              </Label>
              <Switch
                id="pausa-ativa"
                checked={config.pausaAlmoco.ativa}
                onCheckedChange={(valor) => handlePausaAlmocoChange("ativa", valor)}
              />
            </div>

            {config.pausaAlmoco.ativa && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pausa-inicio">Início da Pausa</Label>
                    <Input
                      id="pausa-inicio"
                      type="time"
                      value={config.pausaAlmoco.inicio}
                      onChange={(e) => handlePausaAlmocoChange("inicio", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pausa-fim">Fim da Pausa</Label>
                    <Input
                      id="pausa-fim"
                      type="time"
                      value={config.pausaAlmoco.fim}
                      onChange={(e) => handlePausaAlmocoChange("fim", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preview dos Horários */}
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Horários Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Baseado nas configurações atuais, os horários disponíveis serão:
              </p>
              <p className="text-sm">
                <strong>Datas disponíveis:</strong>{" "}
                {config.datasDisponiveis.length > 0
                  ? config.datasDisponiveis
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => format(date, "dd/MM/yyyy"))
                    .join(", ")
                  : "Nenhuma data selecionada"}
              </p>
              <p className="text-sm">
                <strong>Horário:</strong> {config.horarios.inicio} às {config.horarios.fim}
                {config.pausaAlmoco.ativa && ` (pausa: ${config.pausaAlmoco.inicio} às ${config.pausaAlmoco.fim})`}
              </p>
              <p className="text-sm">
                <strong>Sessões:</strong> {config.sessao.duracao} minutos cada, {config.sessao.vagasPorHorario} vagas
                por horário
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={salvarConfiguracoes} disabled={loading} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};
