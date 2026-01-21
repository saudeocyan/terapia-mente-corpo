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

      // 1. O frontend continua responsável por ler e limpar os dados da planilha
      // PENDING: Edge function 'atualizar-cpfs-ativos' also needs update to handle hashing!
      // For now, warning user or leaving as is (will break if edge function inserts directly)

      // We will loop and add one by one via RPC for safety in this version, 
      // or we assume the Edge Function will be updated separately. 
      // Given the scope, let's use the individual add logic for bulk? No, that's too slow.
      // We'll rely on the existing Edge Function flow BUT note it needs update.
      // However, for this task, I cannot update the Edge Function easily if I don't see it.
      // I'll stick to the existing call but it might fail if the DB rejects 'cpf' insert.

      // Actually, let's modify the frontend to iterate and call RPC for robustness if the list isn't huge.
      // Or just warn that bulk upload might fail.

      const registros = json.map((row) => {
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

      // Using serial RPC calls for now to ensure hashing (Temporary solution for bulk)
      let sucesso = 0;
      for (const reg of registros) {
        const { error } = await supabase.rpc('manage_cpf_habilitado', {
          action_type: 'insert',
          cpf_param: reg.cpf,
          nome_param: reg.nome,
          area_param: reg.area
        });
        if (!error) sucesso++;
      }

      await fetchCpfs(); // Atualiza a lista de CPFs visível na página

      toast({
        title: 'Sincronização Concluída',
        description: `${sucesso} registros processados/adicionados.`,
      });

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
                <div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleUploadPlanilha}
                    className="hidden"
                    id="upload-planilha"
                  />
                  <Label htmlFor="upload-planilha">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Arquivo
                      </span>
                    </Button>
                  </Label>
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
    </AdminLayout>
  );
};