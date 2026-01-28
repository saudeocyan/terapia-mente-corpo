import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { corsHeaders, hashCpf } from "shared/crypto.ts";

Deno.serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Salty Hash
    const cpfHash = await hashCpf(cpf);

    const { data: agendamentos, error } = await supabaseClient
      .from('agendamentos')
      .select('*')
      .eq('cpf_hash', cpfHash) // Fixed column
      .eq('status', 'confirmado')
      .order('data', { ascending: true });

    if (error) {
      throw error;
    }

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
    const msg = error instanceof Error ? error.message : 'Erro';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor: ' + msg }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
