import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { corsHeaders, hashCpf } from "shared/crypto.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ValidarCpfRequest {
  cpf: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf }: ValidarCpfRequest = await req.json();

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório', habilitado: false }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Use Shared Salted Hash
    const cpfHash = await hashCpf(cpf);

    const { data, error } = await supabase
      .from('cpf_habilitado')
      .select('cpf_hash, nome')
      .eq('cpf_hash', cpfHash)
      .maybeSingle(); // Use maybeSingle instead of single to handle not found gracefully

    if (error) {
      console.error('Erro ao verificar CPF:', error);
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor', habilitado: false }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const habilitado = !!data;

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
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação: ' + msg, habilitado: false }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
