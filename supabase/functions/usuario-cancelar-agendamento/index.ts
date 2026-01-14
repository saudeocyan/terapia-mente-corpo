import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// AJUSTE: Headers CORS atualizados para ler a variável de ambiente
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// REMOVIDO: A função hashToken não é mais necessária

// Função para mascarar CPF (mantida para logs)
function maskCpf(cpf: string) {
  if (!cpf || cpf.length < 3) return '***';
  return '*'.repeat(cpf.length - 3) + cpf.slice(-3);
}

const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Validar se o método é POST
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
    // AJUSTE: 'cancel_token' removido da extração
    const { cpf, agendamento_id } = await req.json();

    console.log('=== CANCELAMENTO SEM TOKEN ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('CPF mascarado:', maskCpf(cpf));
    console.log('Agendamento ID:', agendamento_id ? 'presente' : 'ausente');

    // Validar parâmetros obrigatórios (CPF e ID)
    if (!cpf) {
      console.error('Erro: CPF não fornecido');
      return new Response(JSON.stringify({
        success: false,
        message: 'CPF é obrigatório'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (!agendamento_id) {
      console.error('Erro: ID do agendamento não fornecido');
      return new Response(JSON.stringify({
        success: false,
        message: 'ID do agendamento é obrigatório'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // REMOVIDO: Bloco de validação 'if (!cancel_token)'

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // REMOVIDO: Geração do 'tokenHash'

    // AJUSTE: Buscar agendamento apenas com CPF e ID
    const { data: agendamento, error: selectError } = await supabaseAdmin
      .from('agendamentos')
      .select('id, cpf, status, nome') // 'cancel_token_hash' removido do select
      .eq('id', agendamento_id)
      .eq('cpf', cpf) // A segurança agora é baseada na combinação de ID e CPF
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
      console.log('Agendamento não encontrado para o CPF e ID fornecidos');
      return new Response(JSON.stringify({
        success: false,
        message: 'Agendamento não encontrado ou não pertence a este CPF'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verificar se o agendamento já foi cancelado (boa prática mantida)
    if (agendamento.status === 'cancelado') {
      console.log('Agendamento já estava cancelado');
      return new Response(JSON.stringify({
        success: false,
        message: 'Este agendamento já foi cancelado anteriormente'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // REMOVIDO: Bloco de verificação do hash do token (if !agendamento.cancel_token_hash)
    // REMOVIDO: Bloco de verificação do hash do token (if agendamento.cancel_token_hash !== tokenHash)

    console.log('Validação de CPF e ID bem-sucedida, procedendo com cancelamento.');
    
    // Atualizar status do agendamento para "cancelado"
    const { error: updateError } = await supabaseAdmin
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', agendamento_id);

    if (updateError) {
      console.error('Erro ao atualizar status do agendamento:', updateError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Erro interno ao cancelar agendamento'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('Agendamento cancelado com sucesso');
    console.log('Nome:', agendamento.nome);
    console.log('CPF mascarado:', maskCpf(cpf));
    console.log('=== FIM CANCELAMENTO ===');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Agendamento cancelado com sucesso'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Erro ao processar cancelamento:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
