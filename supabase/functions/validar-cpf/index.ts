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

interface ValidarCpfRequest {
  cpf: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf }: ValidarCpfRequest = await req.json();

    console.log('=== DEBUG VALIDAR CPF ===');
    console.log('CPF recebido:', cpf);
    console.log('Tipo do CPF:', typeof cpf);
    console.log('Length do CPF:', cpf?.length);

    if (!cpf) {
      console.log('CPF não fornecido');
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório', habilitado: false }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validar e Hash do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    const msgBuffer = new TextEncoder().encode(cpfLimpo);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const cpfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verificar se CPF está habilitado
    console.log('Fazendo query para CPF Hash:', cpfHash);
    const { data, error } = await supabase
      .from('cpf_habilitado')
      .select('cpf_hash, nome')
      .eq('cpf_hash', cpfHash)
      .single();

    console.log('Resultado da query - data:', data);
    console.log('Resultado da query - error:', error);

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar CPF:', error);
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor', habilitado: false }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const habilitado = !!data;
    console.log('CPF habilitado?', habilitado);
    console.log('=== FIM DEBUG ===');

    return new Response(
      JSON.stringify({
        habilitado,
        nome: data?.nome || null,
        mensagem: habilitado ? 'CPF habilitado para agendamento' : 'CPF não encontrado na lista de habilitados'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Erro na validação de CPF:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação', habilitado: false }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
