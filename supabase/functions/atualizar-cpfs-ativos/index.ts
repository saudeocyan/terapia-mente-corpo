import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verifyAuth } from '../_shared/auth.ts';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Interface para os dados recebidos do frontend
interface CpfRecord {
  cpf: string;
  nome: string;
  area: string;
}

// Interface para os dados copiados para histórico
interface AgendamentoHistoricoRecord {
  id: string;
  nome: string;
  cpf_hash: string;
  data: string;
  horario: string;
  status: string;
  area: string;
  criado_em: string;
}

// Função auxiliar para copiar agendamentos ao histórico
async function copiarAgendamentosParaHistorico(supabase: SupabaseClient, cpfsHashes: string[]) {
  if (cpfsHashes.length === 0) {
    console.log("Nenhum CPF para remover, logo, nenhum agendamento para copiar ao histórico.");
    return 0;
  }

  console.log(`Buscando agendamentos para ${cpfsHashes.length} CPFs para copiar ao histórico...`);

  // Update columns to select cpf_hash instead of cpf
  const colunasParaCopiar = 'id, nome, cpf_hash, data, horario, status, area, criado_em';

  const { data: agendamentosParaCopiar, error: erroBusca } = await supabase
    .from('agendamentos')
    .select(colunasParaCopiar)
    .in('cpf_hash', cpfsHashes);

  if (erroBusca) {
    console.error('Erro ao buscar agendamentos para copiar:', erroBusca);
    throw new Error('Erro ao buscar agendamentos para histórico.');
  }

  if (!agendamentosParaCopiar || agendamentosParaCopiar.length === 0) {
    console.log("Nenhum agendamento encontrado para os CPFs a serem removidos.");
    return 0;
  }

  console.log(`Encontrados ${agendamentosParaCopiar.length} agendamentos para copiar.`);

  const { error: erroInsercaoHistorico } = await supabase
    .from('agendamentos_historico')
    .insert(agendamentosParaCopiar as AgendamentoHistoricoRecord[]);

  if (erroInsercaoHistorico) {
    console.error('Erro ao inserir agendamentos no histórico:', JSON.stringify(erroInsercaoHistorico, null, 2));
    throw new Error('Erro ao salvar histórico de agendamentos.');
  }

  console.log(`${agendamentosParaCopiar.length} agendamentos copiados para o histórico.`);
  return agendamentosParaCopiar.length;
}

// Handler Principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await verifyAuth(req);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 'registros' é a lista completa da planilha nova
    const registros: CpfRecord[] = await req.json();

    if (!Array.isArray(registros) || registros.length === 0) {
      return new Response(JSON.stringify({ error: 'Lista de CPFs vazia ou inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Recebidos ${registros.length} registros.`);

    // Hash all incoming CPFs
    const registrosComHash = await Promise.all(registros.map(async (r) => {
      const cpfLimpo = r.cpf.replace(/\D/g, '');
      const msgBuffer = new TextEncoder().encode(cpfLimpo);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const cpfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return { ...r, cpf_hash: cpfHash };
    }));

    // ✅ CORREÇÃO 1: Remover duplicatas ANTES de processar
    const registrosUnicos = Array.from(
      new Map(registrosComHash.map(r => [r.cpf_hash, r])).values()
    );

    const duplicatasRemovidas = registros.length - registrosUnicos.length;
    if (duplicatasRemovidas > 0) {
      console.log(`⚠️ Removidas ${duplicatasRemovidas} duplicatas da planilha.`);
    }

    const { data: cpfsAtuaisData, error: erroListagem } = await supabaseClient
      .from('cpf_habilitado')
      .select('cpf_hash');

    if (erroListagem) throw new Error('Erro ao buscar CPFs existentes.');

    // ✅ CORREÇÃO 2: Type assertion explícito para evitar erro TS2345
    const cpfsAtuaisSet = new Set<string>(
      (cpfsAtuaisData as Array<{ cpf_hash: string }>)?.map(c => c.cpf_hash) || []
    );

    const cpfsPlanilhaSet = new Set(registrosUnicos.map(r => r.cpf_hash));

    // Identifica CPFs para remover (HASHES)
    const cpfsParaRemover = Array.from(cpfsAtuaisSet).filter(hash => !cpfsPlanilhaSet.has(hash));

    console.log(`Identificado -> Remover: ${cpfsParaRemover.length}`);

    let agendamentosMovidos = 0;

    // Lógica de Remoção
    if (cpfsParaRemover.length > 0) {
      console.log("Iniciando processo de cópia para histórico...");
      agendamentosMovidos = await copiarAgendamentosParaHistorico(supabaseClient, cpfsParaRemover);

      console.log(`Deletando ${cpfsParaRemover.length} CPFs da tabela cpf_habilitado...`);
      const { error: erroDeleteCpfs } = await supabaseClient
        .from('cpf_habilitado')
        .delete()
        .in('cpf_hash', cpfsParaRemover);

      if (erroDeleteCpfs) {
        console.error('Erro ao deletar CPFs:', erroDeleteCpfs);
        throw new Error('Erro ao remover CPFs desabilitados.');
      }
      console.log(`${cpfsParaRemover.length} CPFs removidos com sucesso.`);
    }

    // ✅ CORREÇÃO 3: Upsert com registros únicos
    if (registrosUnicos.length > 0) {
      console.log(`Iniciando "upsert" de ${registrosUnicos.length} registros (adicionar/atualizar)...`);

      // Prepare payload for DB (remove original cpf, keep cpf_hash)
      const payload = registrosUnicos.map(r => ({
        cpf_hash: r.cpf_hash,
        nome: r.nome,
        area: r.area
      }));

      const { error: erroUpsert } = await supabaseClient
        .from('cpf_habilitado')
        .upsert(payload, {
          onConflict: 'cpf_hash'
        });

      if (erroUpsert) {
        console.error('Erro ao fazer upsert de CPFs:', JSON.stringify(erroUpsert, null, 2));
        throw new Error('Erro ao adicionar/atualizar CPFs.');
      }
      console.log(`${registrosUnicos.length} CPFs adicionados/atualizados com sucesso.`);
    }

    // Mensagem final
    const mensagem = `Sincronização concluída: ${cpfsParaRemover.length} removidos (${agendamentosMovidos} agendamentos movidos), ${registrosUnicos.length} CPFs adicionados/atualizados` +
      (duplicatasRemovidas > 0 ? `, ${duplicatasRemovidas} duplicatas ignoradas.` : '.');

    console.log(mensagem);

    return new Response(JSON.stringify({
      mensagem,
      detalhes: {
        adicionados_atualizados: registrosUnicos.length,
        removidos: cpfsParaRemover.length,
        agendamentos_movidos: agendamentosMovidos,
        duplicatas_ignoradas: duplicatasRemovidas
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
    console.error('Erro em atualizar-cpfs-ativos:', errorMessage);
    const status = errorMessage.includes("Acesso não autorizado") || errorMessage.includes("Token inválido") ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
