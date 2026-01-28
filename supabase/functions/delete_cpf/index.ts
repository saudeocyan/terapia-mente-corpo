import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts";
import { corsHeaders, hashCpf } from "shared/crypto.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');

function getCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${name}=`));
  return targetCookie ? targetCookie.substring(name.length + 1) : undefined;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET não está configurado.");
    }

    const cookieHeader = req.headers.get('Cookie');
    const token = getCookie(cookieHeader, 'admin_token');

    if (!token) {
      throw new Error("Acesso não autorizado: Token não encontrado.");
    }

    const keyData = new TextEncoder().encode(JWT_SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    await verify(token, key, { algorithm: "HS256" });

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { cpf } = await req.json();

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: 'CPF é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use Salted Hash
    const cpfHash = await hashCpf(cpf);

    const { error } = await supabase
      .from('cpf_habilitado')
      .delete()
      .eq('cpf_hash', cpfHash); // Fixed column

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'CPF e agendamentos excluídos com sucesso'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
    console.error('❌ Erro na função delete_cpf:', errorMessage);

    const status = errorMessage.includes("Acesso não autorizado") ||
      errorMessage.includes("Token inválido") ||
      errorMessage.includes("signature") ? 401 : 500;

    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        detalhes: errorMessage
      }),
      { status: status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
