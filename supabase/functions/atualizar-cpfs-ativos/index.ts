import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

// Função auxiliar para copiar agendamentos ao histórico
async function copiarAgendamentosParaHistorico(supabase: any, cpfsHashes: string[]) {
  if (cpfsHashes.length === 0) {
    console.log("Nenhum CPF para remover.");
    return 0;
  }

  console.log(`Buscando agendamentos para ${cpfsHashes.length} CPFs...`);
  const { data: agendamentosParaCopiar, error: erroBusca } = await supabase
    .from('agendamentos')
    .select('id, nome, cpf_hash, data, horario, status, area, criado_em')
    .in('cpf_hash', cpfsHashes);

  if (erroBusca) {
    console.error('Erro ao buscar agendamentos:', JSON.stringify(erroBusca));
    throw new Error('Erro ao buscar agendamentos para histórico.');
  }

  if (!agendamentosParaCopiar || agendamentosParaCopiar.length === 0) {
    console.log("Nenhum agendamento encontrado para os CPFs removidos.");
    return 0;
  }

  console.log(`Copiando ${agendamentosParaCopiar.length} agendamentos para histórico...`);
  const { error: erroInsercao } = await supabase
    .from('agendamentos_historico')
    .insert(agendamentosParaCopiar);

  if (erroInsercao) {
    console.error('Erro ao inserir no histórico:', JSON.stringify(erroInsercao));
    throw new Error(`Erro ao salvar histórico: ${JSON.stringify(erroInsercao)}`);
  }

  return agendamentosParaCopiar.length;
}

// Handler Principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- AUTENTICAÇÃO ---
    console.log('Step 1: Verificando Authorization header...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization header ausente ou inválido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parseia o JWT para extrair o user ID sem precisar de outra lib
    console.log('Step 2: Parseando JWT para extrair user ID...');
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      userId = payload.sub;
      console.log(`User ID extraído: ${userId}`);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Token JWT inválido ou malformado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Usa o cliente admin para checar o role sem depender de RLS
    console.log('Step 3: Criando cliente admin e verificando role...');
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Erro ao buscar profile:', JSON.stringify(profileError));
      return new Response(JSON.stringify({ error: `Erro ao verificar permissão: ${profileError.message}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (profileData?.role !== 'admin') {
      console.error(`Acesso negado. Role encontrado: ${profileData?.role}`);
      return new Response(JSON.stringify({ error: 'Acesso negado: apenas administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Step 4: Admin verificado. Lendo body da requisição...');
    const registros: CpfRecord[] = await req.json();

    if (!Array.isArray(registros) || registros.length === 0) {
      return new Response(JSON.stringify({ error: 'Lista de CPFs vazia ou inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Step 5: ${registros.length} registros recebidos. Iniciando hash...`);

    const registrosComHash = await Promise.all(registros.map(async (r) => {
      const cpfLimpo = String(r.cpf || '').replace(/\D/g, '');
      const msgBuffer = new TextEncoder().encode(cpfLimpo);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const cpfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return { ...r, cpf_hash: cpfHash };
    }));

    const registrosUnicos = Array.from(
      new Map(registrosComHash.map(r => [r.cpf_hash, r])).values()
    );
    const duplicatasRemovidas = registros.length - registrosUnicos.length;

    console.log(`Step 6: ${registrosUnicos.length} únicos (${duplicatasRemovidas} duplicatas). Buscando CPFs do banco...`);

    const { data: cpfsAtuaisData, error: erroListagem } = await adminClient
      .from('cpf_habilitado')
      .select('cpf_hash, nome');

    if (erroListagem) {
      console.error('Erro ao listar CPFs:', JSON.stringify(erroListagem));
      throw new Error(`Erro ao buscar CPFs existentes: ${erroListagem.message}`);
    }

    const cpfsAtuaisSet = new Set<string>();
    const mapNomesAtuais = new Map<string, string>();
    for (const row of (cpfsAtuaisData ?? [])) {
      cpfsAtuaisSet.add(row.cpf_hash);
      if (row.nome) mapNomesAtuais.set(row.cpf_hash, row.nome);
    }

    const cpfsPlanilhaSet = new Set(registrosUnicos.map(r => r.cpf_hash));
    const registrosNovos = registrosUnicos.filter(r => !cpfsAtuaisSet.has(r.cpf_hash));
    const registrosAtualizados = registrosUnicos.filter(r => cpfsAtuaisSet.has(r.cpf_hash));
    const cpfsParaRemover = Array.from(cpfsAtuaisSet).filter(hash => !cpfsPlanilhaSet.has(hash));
    const nomesParaRemover = cpfsParaRemover.map(hash => mapNomesAtuais.get(hash) || 'Nome não encontrado');

    console.log(`Step 7: Novos=${registrosNovos.length}, Atualizar=${registrosAtualizados.length}, Remover=${cpfsParaRemover.length}`);

    let agendamentosMovidos = 0;

    if (cpfsParaRemover.length > 0) {
      console.log('Step 8: Removendo CPFs e movendo agendamentos...');
      agendamentosMovidos = await copiarAgendamentosParaHistorico(adminClient, cpfsParaRemover);

      const { error: erroDelete } = await adminClient
        .from('cpf_habilitado')
        .delete()
        .in('cpf_hash', cpfsParaRemover);

      if (erroDelete) {
        console.error('Erro ao deletar CPFs:', JSON.stringify(erroDelete));
        throw new Error(`Erro ao remover CPFs: ${erroDelete.message}`);
      }
      console.log(`${cpfsParaRemover.length} CPFs removidos.`);
    }

    if (registrosUnicos.length > 0) {
      console.log(`Step 9: Upsert de ${registrosUnicos.length} registros...`);
      const payload = registrosUnicos.map(r => ({
        cpf_hash: r.cpf_hash,
        nome: r.nome,
        area: r.area
      }));

      const { error: erroUpsert } = await adminClient
        .from('cpf_habilitado')
        .upsert(payload, { onConflict: 'cpf_hash' });

      if (erroUpsert) {
        console.error('Erro no upsert:', JSON.stringify(erroUpsert));
        throw new Error(`Erro ao salvar CPFs: ${erroUpsert.message}`);
      }
      console.log(`Upsert concluído.`);
    }

    const mensagem = `Sincronização concluída: ${registrosNovos.length} adicionados, ${registrosAtualizados.length} atualizados, ${cpfsParaRemover.length} removidos.`;
    console.log(mensagem);

    return new Response(JSON.stringify({
      mensagem,
      detalhes: {
        adicionados: registrosNovos.length,
        atualizados: registrosAtualizados.length,
        removidos: cpfsParaRemover.length,
        agendamentos_movidos: agendamentosMovidos,
        duplicatas_ignoradas: duplicatasRemovidas,
        nomes_adicionados: registrosNovos.map(r => r.nome),
        nomes_atualizados: registrosAtualizados.map(r => r.nome),
        nomes_removidos: nomesParaRemover
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERRO FATAL em atualizar-cpfs-ativos:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
