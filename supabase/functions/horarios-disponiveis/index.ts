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
    let horaAtual = horaInicio;

    while (horaAtual < horaFim) {
      // Verificar se o horário atual conflita com a pausa de almoço
      if (pausaAlmocoAtiva && pausaAlmocoInicio && pausaAlmocoFim) {
        // Converter horários para minutos para facilitar comparação
        const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);
        const [pausaInicioH, pausaInicioM] = pausaAlmocoInicio.split(':').map(Number);
        const [pausaFimH, pausaFimM] = pausaAlmocoFim.split(':').map(Number);
        
        const minutoAtual = horaAtualH * 60 + horaAtualM;
        const minutoPausaInicio = pausaInicioH * 60 + pausaInicioM;
        const minutoPausaFim = pausaFimH * 60 + pausaFimM;
        const minutoFimSessao = minutoAtual + duracaoSessao;
        
        // Se a sessão começar ou terminar durante a pausa, pular
        if ((minutoAtual >= minutoPausaInicio && minutoAtual < minutoPausaFim) ||
            (minutoFimSessao > minutoPausaInicio && minutoFimSessao <= minutoPausaFim) ||
            (minutoAtual < minutoPausaInicio && minutoFimSessao > minutoPausaFim)) {
          
          // Calcular próximo horário (pular para depois da pausa se necessário)
          const [horas, minutos] = horaAtual.split(':').map(Number);
          let totalMinutos = horas * 60 + minutos + duracaoSessao + intervalo;
          
          // Se o próximo horário ainda estiver na pausa, pular para depois da pausa
          if (totalMinutos <= minutoPausaFim) {
            totalMinutos = minutoPausaFim;
          }
          
          const novasHoras = Math.floor(totalMinutos / 60);
          const novosMinutos = totalMinutos % 60;
          horaAtual = `${novasHoras.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
          continue;
        }
      }

      // Buscar agendamentos existentes neste horário
      const { data: agendamentosExistentes } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('data', data)
        .eq('horario', horaAtual)
        .eq('status', 'confirmado');

      const vagasOcupadas = agendamentosExistentes?.length || 0;
      const vagasDisponiveis = config.vagas_por_horario - vagasOcupadas;

      // MODIFICADO: Verificar se há vagas e se o horário não é passado (caso seja hoje)
      if (vagasDisponiveis > 0) {
        // Se é hoje, verificar se o horário já passou
        if (eHoje) {
          const [horaSlot, minutoSlot] = horaAtual.split(':').map(Number);
          const horaSlotEmMinutos = horaSlot * 60 + minutoSlot;
          
          const horaAtualEmMinutos = horaAtualBrasil.getHours() * 60 + horaAtualBrasil.getMinutes();
          
          // Só adiciona se o horário for no futuro
          if (horaSlotEmMinutos > horaAtualEmMinutos) {
            horarios.push({
              horario: horaAtual,
              vagas_disponiveis: vagasDisponiveis,
              vagas_total: config.vagas_por_horario
            });
          } else {
            console.log(`Horário ${horaAtual} ignorado (já passou)`);
          }
        } else {
          // Se não é hoje, adiciona normalmente
          horarios.push({
            horario: horaAtual,
            vagas_disponiveis: vagasDisponiveis,
            vagas_total: config.vagas_por_horario
          });
        }
      }

      // Calcular próximo horário
      const [horas, minutos] = horaAtual.split(':').map(Number);
      const totalMinutos = horas * 60 + minutos + duracaoSessao + intervalo;
      const novasHoras = Math.floor(totalMinutos / 60);
      const novosMinutos = totalMinutos % 60;
      horaAtual = `${novasHoras.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
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
