import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URLS } from "@/lib/api-constants";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Upload,
  Plus,
  Trash2,
  Search,
  Download,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SyncReport {
  adicionados: number;
  atualizados: number;
  removidos: number;
  agendamentos_movidos: number;
  duplicatas_ignoradas: number;
  nomes_adicionados: string[];
  nomes_atualizados: string[];
  nomes_removidos: string[];
}

interface CpfHabilitado {
  id: string;
  cpf_hash: string;
  nome: string;
  area: string;
  criado_em: string;
}

export const AdminCpfsHabilitados = () => {
  const navigate = useNavigate();
  const [cpfs, setCpfs] = useState<CpfHabilitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoCpf, setNovoCpf] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaArea, setNovaArea] = useState("");
  const [busca, setBusca] = useState("");
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCpfs();
  }, []);

  // Busca CPFs diretamente do Supabase
  const fetchCpfs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cpf_habilitado")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setCpfs(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar CPFs:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const validarCpf = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.length === 11;
  };

  // Adicionar CPF via RPC (Secure Hashing)
  const adicionarCpf = async () => {
    if (!validarCpf(novoCpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    if (!novoNome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome completo.",
        variant: "destructive",
      });
      return;
    }

    const cpfLimpo = novoCpf.replace(/\D/g, "");

    try {
      const { data, error } = await supabase.rpc('manage_cpf_habilitado', {
        action_type: 'insert',
        cpf_param: cpfLimpo,
        nome_param: novoNome.trim(),
        area_param: novaArea.trim()
      });

      if (error) throw error;

      const res = data as any;
      if (!res.success) {
        throw new Error(res.error || "Erro desconhecido ao adicionar CPF");
      }

      setNovoCpf("");
      setNovoNome("");
      setNovaArea("");
      await fetchCpfs();

      toast({
        title: "CPF adicionado",
        description: res.message || "CPF foi adicionado à lista de habilitados com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao adicionar CPF:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar CPF",
        variant: "destructive",
      });
    }
  };

  // Remover CPF via ID (Hash already stored, no need to hash again)
  const removerCpf = async (id: string, nome: string) => {
    try {
      // Deleting by ID is safer/easier than trying to reverse hash logic here
      const { error } = await supabase
        .from("cpf_habilitado")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchCpfs();

      toast({
        title: "CPF removido",
        description: `O colaborador ${nome} foi removido com sucesso.`,
      });

    } catch (error) {
      console.error('Erro ao remover CPF:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover CPF",
        variant: "destructive",
      });
    }
  };

  const baixarModeloPlanilha = () => {
    const modelo = [
      { CPF: "12345678901", Nome: "Nome do Colaborador", Unidade: "Sede" },
      { CPF: "98765432100", Nome: "Outro Colaborador", Unidade: "Filial" }
    ];
    const ws = XLSX.utils.json_to_sheet(modelo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_CPFs");
    XLSX.writeFile(wb, "Modelo_Importacao_CPFs.xlsx");
  };

  const handleUploadPlanilha = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limpa o valor do input para permitir o upload do mesmo ficheiro novamente
    event.target.value = '';
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const registros = json.map((row: any) => {
        const cpfRaw = String(row.CPF || row.cpf || '').replace(/\D/g, '');
        const nome = String(row.Nome || row.nome || '').trim();
        const area = String(row.Unidade || row.Área || row.Setor || row.area || '').trim();
        return { cpf: cpfRaw, nome, area };
      })
        .filter(r => r.cpf.length === 11 && r.nome);

      if (registros.length === 0) {
        toast({ title: 'Nenhum dado válido encontrado', description: 'Verifique se a planilha tem as colunas CPF e Nome.', variant: 'destructive' });
        return;
      }

      // NOVO FLUXO DE BULK SYNC via Edge Function
      const { data, error } = await supabase.functions.invoke('atualizar-cpfs-ativos', {
        body: registros
      });

      if (error) throw error;

      await fetchCpfs(); // Atualiza a lista de CPFs visível na tela

      if (data && data.detalhes) {
        setSyncReport(data.detalhes);
        setIsReportOpen(true);
      } else {
        toast({
          title: 'Sincronização Concluída',
          description: data?.mensagem || 'Planilha processada com sucesso.',
        });
      }

    } catch (err) {
      console.error('Erro ao importar planilha:', err);
      toast({
        title: 'Erro na importação',
        description: err instanceof Error ? err.message : 'Verifique o arquivo e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarCpfs = () => {
    // Export only names and areas, since CPFs are hashed
    const dataToExport = cpfs.map(c => ({
      Nome: c.nome,
      Unidade: c.area,
      Inclusao: new Date(c.criado_em).toLocaleDateString('pt-BR')
    }));

    // Convert to CSV
    const headers = ["Nome", "Unidade", "Inclusao"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(row => `${row.Nome},${row.Unidade},${row.Inclusao}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "cpfs_habilitados_protegido.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cpfsFiltrados = cpfs.filter(item =>
    // item.cpf.includes(busca) -- CPF display removed
    (item.nome && item.nome.toLowerCase().includes(busca.toLowerCase())) ||
    (item.area && item.area.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <AdminLayout title="CPFs Habilitados">
      <div className="space-y-6">
        {/* Informações */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Somente CPFs habilitados poderão agendar sessões. <br />
                <span className="text-xs">Nota: Por segurança, os CPFs são armazenados como HASH e não são visíveis.</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{cpfs.length}</div>
                <p className="text-sm text-muted-foreground">CPFs Habilitados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {cpfs.filter(c => {
                    const dataCriacao = (c as any).created_at || c.criado_em || "";
                    return dataCriacao.split('T')[0] === new Date().toISOString().split('T')[0];
                  }).length}
                </div>
                <p className="text-sm text-muted-foreground">Adicionados Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">1</div>
                <p className="text-sm text-muted-foreground">Sistema Único</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adicionar CPF Manualmente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar CPF Manualmente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="novo-cpf">CPF</Label>
                <Input
                  id="novo-cpf"
                  placeholder="000.000.000-00"
                  value={formatarCpf(novoCpf)}
                  onChange={(e) => setNovoCpf(e.target.value)}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novo-nome">Nome Completo</Label>
                <Input
                  id="novo-nome"
                  placeholder="Digite o nome completo"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nova-area">Unidade/Área</Label>
                <Input
                  id="nova-area"
                  placeholder="Ex.: Comercial, TI, RH..."
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={adicionarCpf} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar CPF
            </Button>
          </CardContent>
        </Card>

        {/* Upload de Planilha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar CPFs via Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Faça upload de uma planilha (.csv ou .xlsx) com os CPFs
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formato esperado: CPF, Nome, Unidade (uma linha por colaborador)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="w-full sm:w-auto">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleUploadPlanilha}
                      className="hidden"
                      id="upload-planilha"
                    />
                    <Label htmlFor="upload-planilha" className="m-0 w-full">
                      <Button variant="outline" className="cursor-pointer w-full sm:w-auto" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar Arquivo
                        </span>
                      </Button>
                    </Label>
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto cursor-pointer"
                    onClick={baixarModeloPlanilha}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo de Planilha
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de CPFs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de CPFs Habilitados
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportarCpfs}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou unidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabela */}
            {cpfsFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {busca ? "Nenhum participante encontrado para esta busca" : "Nenhum CPF habilitado encontrado"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF (Protegido)</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Data de Inclusão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cpfsFiltrados.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-muted-foreground text-xs">*** PROTEGIDO ***</TableCell>
                        <TableCell>{item.nome || '-'}</TableCell>
                        <TableCell>{item.area || '-'}</TableCell>
                        <TableCell>
                          {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Participante</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {item.nome} da lista de habilitados?
                                  Todos os agendamentos relacionados também serão excluídos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removerCpf(item.id, item.nome)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Relatório de Sincronização */}
      <AlertDialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-primary flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Relatório de Sincronização em Lote
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2 text-slate-600">
              O cruzamento da sua planilha com o banco de dados foi concluído transacionalmente. Veja o resumo exato do que foi feito:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {syncReport && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-green-600">{syncReport.adicionados}</p>
                  <p className="text-sm font-medium text-green-800 mt-1">Novos</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-blue-600">{syncReport.atualizados}</p>
                  <p className="text-sm font-medium text-blue-800 mt-1">Atualizados</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-red-600">{syncReport.removidos}</p>
                  <p className="text-sm font-medium text-red-800 mt-1">Removidos</p>
                </div>
              </div>

              {syncReport.duplicatas_ignoradas > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  ⚠️ <strong>{syncReport.duplicatas_ignoradas}</strong> registros duplicados dentro da própria planilha enviada foram ignorados.
                </p>
              )}

              <div className="space-y-5 text-sm mt-6">
                {syncReport.nomes_adicionados.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-slate-100">
                    <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4" /> Colaboradores Adicionados ({syncReport.adicionados})
                    </h4>
                    <p className="text-xs text-slate-500 mb-2">Pessoas inéditas recém inseridas no sistema.</p>
                    <ul className="list-disc pl-5 text-slate-600 max-h-32 overflow-y-auto space-y-1">
                      {syncReport.nomes_adicionados.map((nome, i) => <li key={i}>{nome}</li>)}
                    </ul>
                  </div>
                )}

                {syncReport.nomes_atualizados.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-slate-100">
                    <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" /> Cadastros Mantidos/Atualizados ({syncReport.atualizados})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Colaboradores que já estavam na base e continuam ativos (os dados de Nome/Unidade foram atualizados caso tenham mudado).
                    </p>
                  </div>
                )}

                {syncReport.nomes_removidos.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-slate-100">
                    <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                      <Trash2 className="h-4 w-4" /> Colaboradores Removidos ({syncReport.removidos})
                    </h4>
                    <p className="text-xs text-slate-500 mb-2">
                      Pessoas que estavam no banco de dados e <strong>não</strong> apareceram na sua nova planilha.
                    </p>
                    <ul className="list-disc pl-5 text-slate-600 max-h-32 overflow-y-auto space-y-1">
                      {syncReport.nomes_removidos.map((nome, i) => <li key={i}>{nome}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsReportOpen(false)} className="w-full sm:w-auto h-11 px-8 rounded-full">
              Entendido e Concluído
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};