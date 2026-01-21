import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
};

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, cpf, data, horario } = await req.json();
    if (!nome || !cpf || !data || !horario) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hash do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    const msgBuffer = new TextEncoder().encode(cpfLimpo);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const cpfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verificar se CPF está habilitado
    const { data: cpfData, error: cpfError } = await supabase
      .from('cpf_habilitado')
      .select('cpf_hash, nome, area')
      .eq('cpf_hash', cpfHash)
      .single();

    if (cpfError || !cpfData) {
      return new Response(JSON.stringify({ error: 'CPF não está habilitado para agendamento' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verificar limite de 1 agendamento por semana
    const dataAgendamento = new Date(data + 'T00:00:00Z');
    const diaDaSemana = dataAgendamento.getUTCDay();
    const inicioSemana = new Date(dataAgendamento);
    inicioSemana.setUTCDate(dataAgendamento.getUTCDate() - diaDaSemana + (diaDaSemana === 0 ? -6 : 1));
    const fimSemana = new Date(inicioSemana);
    fimSemana.setUTCDate(inicioSemana.getUTCDate() + 6);

    const { data: agendamentoExistente, error: checkError } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('cpf_hash', cpfHash)
      .eq('status', 'confirmado')
      .gte('data', inicioSemana.toISOString().split('T')[0])
      .lte('data', fimSemana.toISOString().split('T')[0]);

    if (checkError) throw checkError;

    if (agendamentoExistente && agendamentoExistente.length > 0) {
      return new Response(JSON.stringify({ error: 'Você já possui um agendamento confirmado nesta semana' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verificar disponibilidade de vagas
    const { data: agendamentosHorario } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('horario', horario)
      .eq('status', 'confirmado');

    const { data: config } = await supabase
      .from('configuracoes_disponibilidade')
      .select('vagas_por_horario')
      .maybeSingle();

    const vagasOcupadas = agendamentosHorario?.length || 0;
    const vagasDisponiveis = config?.vagas_por_horario || 1;

    if (vagasOcupadas >= vagasDisponiveis) {
      return new Response(JSON.stringify({ error: 'Não há vagas disponíveis neste horário' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Criar agendamento
    const nomeCompleto = cpfData.nome || nome;
    const { data: novoAgendamento, error } = await supabase
      .from('agendamentos')
      .insert({
        nome: nomeCompleto,
        cpf_hash: cpfHash,
        data,
        horario,
        status: 'confirmado',
        area: cpfData.area || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      return new Response(JSON.stringify({ error: 'Erro ao criar agendamento' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Retornar sucesso
    return new Response(JSON.stringify({
      sucesso: true,
      agendamento: novoAgendamento,
      mensagem: 'Agendamento criado com sucesso.'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    // ✅ CORREÇÃO: Type guard adicionado
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
    console.error('Erro ao processar agendamento:', errorMessage);

    return new Response(JSON.stringify({
      error: 'Erro interno do servidor: ' + errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
