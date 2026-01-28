import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const data = url.searchParams.get('data');

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Data é obrigatória' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verificar se a data está habilitada para agendamentos
    const { data: dataDisponivel, error: dataError } = await supabase
      .from('datas_disponiveis')
      .select('*')
      .eq('data', data)
      .eq('ativo', true)
      .single();

    if (dataError || !dataDisponivel) {
      console.log('Data não está disponível para agendamentos:', data);
      return new Response(
        JSON.stringify({
          horarios: [],
          mensagem: 'Esta data não está disponível para agendamentos'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar configurações de disponibilidade
    const { data: config, error: configError } = await supabase
      .from('configuracoes_disponibilidade')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('Erro ao buscar configurações:', configError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Gerar horários disponíveis baseado na configuração
    const horaInicio = config.hora_inicio;
    const horaFim = config.hora_fim;
    const duracaoSessao = config.duracao_sessao;
    const intervalo = config.intervalo;
    const pausaAlmocoAtiva = config.pausa_almoco_ativa;
    const pausaAlmocoInicio = config.pausa_almoco_inicio;
    const pausaAlmocoFim = config.pausa_almoco_fim;

    // NOVO: Obter data e hora atual no fuso horário do Brasil
    const timeZone = 'America/Sao_Paulo';
    const agora = new Date();
    const horaAtualBrasil = new Date(agora.toLocaleString('en-US', { timeZone }));
    const dataHoje = horaAtualBrasil.toISOString().split('T')[0];
    const eHoje = data === dataHoje;

    console.log(`Verificando horários para ${data}. É hoje? ${eHoje}. Hora atual: ${horaAtualBrasil.getHours()}:${horaAtualBrasil.getMinutes()}`);

    const horarios = [];

    // --- LOGICA DE CUSTOM SLOTS ---
    const customSlots: string[] | null = dataDisponivel.custom_slots;

    if (customSlots && customSlots.length > 0) {
      console.log("Usando slots personalizados:", customSlots);
      // Se tiver custom slots, iteramos sobre eles em vez de gerar
      for (const time of customSlots) {
        // Ignoramos a lógica de pausa de almoço automática aqui, pois o admin definiu manual
        // Mas AINDA precisamos checar se já está ocupado e se é futuro (se for hoje)

        // Buscar agendamentos existentes neste horário
        // NOTE: 'horario' in DB is text and formatted as HH:mm:00, while time (custom_slots) is HH:mm.
        // We must append :00 for exact match.
        const { data: agendamentosExistentes } = await supabase
          .from('agendamentos')
          .select('id, cpf_hash')
          .eq('data', data)
          .eq('horario', time + ':00')
          .eq('status', 'confirmado');

        // Check for Admin Block (SYSTEM_BLOCK)
        const isBlocked = agendamentosExistentes?.some((a: any) => a.cpf_hash === 'SYSTEM_BLOCK');

        let vagasDisponiveis = 0;

        if (isBlocked) {
          vagasDisponiveis = 0;
        } else {
          const vagasOcupadas = agendamentosExistentes?.length || 0;
          vagasDisponiveis = config.vagas_por_horario - vagasOcupadas;
        }

        if (vagasDisponiveis > 0) {
          if (eHoje) {
            const [h, m] = time.split(':').map(Number);
            const slotMin = h * 60 + m;
            const nowMin = horaAtualBrasil.getHours() * 60 + horaAtualBrasil.getMinutes();

            if (slotMin > nowMin) {
              horarios.push({
                horario: time,
                vagas_disponiveis: vagasDisponiveis,
                vagas_total: config.vagas_por_horario
              });
            } else {
              console.log(`Custom Slot ${time} ignorado (já passou)`);
            }
          } else {
            horarios.push({
              horario: time,
              vagas_disponiveis: vagasDisponiveis,
              vagas_total: config.vagas_por_horario
            });
          }
        }
      }

    } else {
      // --- LOGICA RESTRITA (MANUAL APENAS) ---
      // Se não houver custom_slots, não geramos nada automaticamente.
      // O usuário solicitou explicitamente: "remova os horários 'definidos'... todo horário setado deve ser pelo 'modo personalizado'"
      console.log("Sem custom_slots definidos para data ativa. Retornando 0 slots.");
      // Nenhuma ação necessária, array 'horarios' permanece vazio.
    }

    console.log(`Total de horários disponíveis retornados: ${horarios.length}`);

    return new Response(
      JSON.stringify({
        horarios,
        data,
        configuracao: {
          duracao_sessao: config.duracao_sessao,
          vagas_por_horario: config.vagas_por_horario
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
