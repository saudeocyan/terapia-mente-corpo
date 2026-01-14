// 1. AJUSTE DE IMPORT: Usando versões compatíveis e auth manual
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts"; // Versão compatível

// 2. AJUSTE DE CORS: Usar variável de ambiente e permitir credenciais
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, OPTIONS' // Esta função usa POST
};

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// 3. ADICIONADO: Função auxiliar para extrair cookie (igual à de delete_cpf)
function getCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${name}=`));
  return targetCookie ? targetCookie.substring(name.length + 1) : undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 4. AJUSTE DE AUTH: Lógica de verificação manual do cookie (substitui verifyAuth)
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
    // Sintaxe correta do verify (com objeto)
    await verify(token, key, { algorithm: "HS256" });
    console.log('✅ Autenticação bem-sucedida');

    // --- Lógica da função (sem alteração) ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { cpf, nome, area } = await req.json();

    if (!cpf || !nome) {
      console.error('Campos obrigatórios faltando');
      return new Response(
        JSON.stringify({ error: 'CPF e nome são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      console.error('CPF inválido:', cpfLimpo);
      return new Response(
        JSON.stringify({ error: 'CPF deve conter 11 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Inserindo CPF:', cpfLimpo);

    const { data, error } = await supabase
      .from('cpf_habilitado')
      .insert({ 
        cpf: cpfLimpo,
        nome: nome.trim(),
        area: area?.trim() || ''
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir CPF:', error);
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Este CPF já está cadastrado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error; // Lança para o catch principal
    }

    console.log('CPF inserido com sucesso');
    return new Response(
      JSON.stringify({ 
        mensagem: 'CPF adicionado com sucesso',
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  // 5. AJUSTE NO CATCH: Adicionado "type guard"
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
    
    console.error('Erro na função inserir_cpf:', errorMessage);

    // Define status 401 se for erro de auth, 500 para outros
    const status = errorMessage.includes("Acesso não autorizado") || errorMessage.includes("Token inválido") || errorMessage.includes("signature") ? 401 : 500;
    
    return new Response(
      // Mensagem de erro genérica, mas log detalhado acima
      JSON.stringify({ error: errorMessage || 'Erro ao inserir CPF' }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
