import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const cpf = url.searchParams.get('cpf');

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase com service role para acessar dados
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar agendamentos confirmados do CPF
    const { data: agendamentos, error } = await supabaseClient
      .from('agendamentos')
      .select('*')
      .eq('cpf', cpf)
      .eq('status', 'confirmado')
      .order('data', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar agendamentos' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Filtrar apenas agendamentos futuros
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const agendamentosFuturos = agendamentos?.filter(agendamento => {
      const dataAgendamento = new Date(agendamento.data);
      return dataAgendamento >= hoje;
    }) || [];

    return new Response(
      JSON.stringify(agendamentosFuturos),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Erro na função consultar-agendamentos:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
