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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service Role is required!
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { cpf, nome, area } = await req.json();

    if (!cpf || !nome) {
      return new Response(
        JSON.stringify({ error: 'CPF e nome são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'CPF deve conter 11 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Salted Hash
    const cpfHash = await hashCpf(cpfLimpo);

    const { data, error } = await supabase
      .from('cpf_habilitado')
      .insert({
        cpf_hash: cpfHash, // Fixed column name
        nome: nome.trim(),
        area: area?.trim() || ''
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir CPF:', error);
      if (error.code === '23505') { // Unique violation
        return new Response(
          JSON.stringify({ error: 'Este CPF já está cadastrado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({
        mensagem: 'CPF adicionado com sucesso',
        data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na função inserir_cpf:', errorMessage);
    const status = errorMessage.includes("Acesso não autorizado") || errorMessage.includes("Token inválido") || errorMessage.includes("signature") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage || 'Erro ao inserir CPF' }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
