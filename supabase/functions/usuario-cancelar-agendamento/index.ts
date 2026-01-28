import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { corsHeaders, hashCpf } from "shared/crypto.ts";

function maskCpf(cpf: string) {
  if (!cpf || cpf.length < 3) return '***';
  return '*'.repeat(cpf.length - 3) + cpf.slice(-3);
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: 'Method Not Allowed. Use POST.'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const { cpf, agendamento_id } = await req.json();

    if (!cpf || !agendamento_id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'CPF e ID do agendamento são obrigatórios'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use Salted Hash
    const cpfHash = await hashCpf(cpf);

    const { data: agendamento, error: selectError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, cpf_hash, status, nome')
      .eq('id', agendamento_id)
      .eq('cpf_hash', cpfHash) // Fixed column name
      .maybeSingle();

    if (selectError) {
      console.error('Erro ao buscar agendamento:', selectError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Erro interno ao verificar agendamento'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!agendamento) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Agendamento não encontrado ou não pertence a este CPF'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (agendamento.status === 'cancelado') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Este agendamento já foi cancelado anteriormente'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', agendamento_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Agendamento cancelado com sucesso'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Erro ao processar cancelamento:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro interno do servidor: ' + msg
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
