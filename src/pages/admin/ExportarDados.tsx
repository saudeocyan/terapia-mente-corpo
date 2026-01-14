import * as React from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminExportarDados: React.FC = () => {
  const [periodo, setPeriodo] = useState<DateRange | undefined>(undefined);
  const [formatoExportacao, setFormatoExportacao] = useState<'csv' | 'json'>('csv');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!periodo?.from || !periodo?.to) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione um período de datas.',
      });
      return;
    }

    setLoading(true);
    setError(null);

    const data_inicio = periodo.from.toISOString().split('T')[0];
    const data_fim = periodo.to.toISOString().split('T')[0];

    try {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .gte('data', data_inicio)
        .lte('data', data_fim);

      if (filtroStatus && filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      if (filtroCpf) {
        query = query.eq('cpf', filtroCpf.replace(/\D/g, ''));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sem dados",
          description: "Nenhum agendamento encontrado para os filtros selecionados.",
        });
        setLoading(false);
        return;
      }

      let content = "";
      let mimeType = "";
      let filename = `agendamentos_${data_inicio}_a_${data_fim}`;

      if (formatoExportacao === 'csv') {
        mimeType = "text/csv;charset=utf-8;";
        filename += ".csv";
        const headers = ["ID", "Nome", "CPF", "Data", "Horário", "Status", "Criado em"];
        const rows = data.map(item => [
          item.id,
          item.nome,
          item.cpf,
          item.data,
          item.horario,
          item.status || "Pendente",
          (item as any).created_at || (item as any).criado_em || ""
        ]);
        content = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      } else {
        mimeType = "application/json;charset=utf-8;";
        filename += ".json";
        content = JSON.stringify(data, null, 2);
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: `Dados exportados com sucesso como ${filename}.`,
      });

    } catch (error: any) {
      console.error('Erro na exportação:', error);
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao Exportar',
        description: error.message || 'Não foi possível exportar os dados.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Exportar Dados">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Exportar Dados de Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seletor de Período */}
            <div className="space-y-2">
              <Label htmlFor="date">Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodo?.from ? (
                      periodo.to ? (
                        <>
                          {format(periodo.from, "LLL dd, y")} -{" "}
                          {format(periodo.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(periodo.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Selecione um período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={periodo?.from}
                    selected={periodo}
                    onSelect={setPeriodo}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro de Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Filtrar por Status (Opcional)</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de CPF */}
            <div className="space-y-2">
              <Label htmlFor="cpf">Filtrar por CPF (Opcional)</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="Digite o CPF (apenas números)"
                value={filtroCpf}
                onChange={(e) => setFiltroCpf(e.target.value.replace(/\D/g, ''))} // Permite apenas números
                maxLength={11}
              />
            </div>

            {/* Seletor de Formato */}
            <div className="space-y-2">
              <Label htmlFor="formato">Formato de Exportação</Label>
              <Select value={formatoExportacao} onValueChange={(value) => setFormatoExportacao(value as 'csv' | 'json')}>
                <SelectTrigger id="formato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-600">Erro: {error}</p>
            )}

          </CardContent>
          <CardFooter>
            <Button onClick={handleExport} disabled={loading || !periodo?.from || !periodo?.to} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Dados
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminExportarDados;
