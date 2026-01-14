import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.7/mod.ts";
const corsHeaders = {
  // 1. CORREÇÃO CORS: Lendo a variável de ambiente (Secret)
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  // 2. CORREÇÃO CORS: Permitindo todos os headers que o Supabase envia
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true'
};
// 3. CORREÇÃO DE SEGURANÇA: Removidos os valores de fallback
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL');
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');
const JWT_SECRET_STRING = Deno.env.get('JWT_SECRET');
// 4. Verificação robusta de secrets
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET_STRING) {
  const errorMessage = "Erro de configuração: Variáveis de ambiente de autenticação não encontradas.";
  console.error(`ERRO CRÍTICO em admin-auth: ${errorMessage}`);
  serve(async (_req)=>new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }));
} else {
  // 5. CORREÇÃO DO ERRO 500: Preparando a chave secreta para o formato CryptoKey
  const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
  const key = await crypto.subtle.importKey("raw", secretKey, {
    name: "HMAC",
    hash: "SHA-256"
  }, true, [
    "sign",
    "verify"
  ]);
  serve(async (req)=>{
    if (req.method === 'OPTIONS') {
      return new Response("ok", {
        headers: corsHeaders
      });
    }
    try {
      const { action, email, password } = await req.json();
      if (action === 'login') {
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
          return new Response(JSON.stringify({
            error: 'Credenciais inválidas'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        const payload = {
          email: ADMIN_EMAIL,
          role: 'admin',
          exp: getNumericDate(60 * 60 * 8) // Token válido por 8 horas
        };
        // 6. Usando a 'key' preparada
        const token = await create({
          alg: "HS256",
          typ: "JWT"
        }, payload, key);
        const headers = new Headers({
          ...corsHeaders,
          'Content-Type': 'application/json'
        });
        // 7. CORREÇÃO DO LOOP DE LOGIN: Adicionado "Partitioned"
        headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=${60 * 60 * 8}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Login realizado com sucesso'
        }), {
          status: 200,
          headers
        });
      }
      if (action === 'logout') {
        const headers = new Headers({
          ...corsHeaders,
          'Content-Type': 'application/json'
        });
        headers.append('Set-Cookie', `admin_token=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0`);
        return new Response(JSON.stringify({
          success: true,
          message: "Logout realizado com sucesso"
        }), {
          status: 200,
          headers
        });
      }
      // 8. CORREÇÃO DO ERRO 400: Ação 'verify' removida pois não é mais usada pelo ProtectedRoute
      return new Response(JSON.stringify({
        error: 'Ação inválida'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      // AJUSTE 1: Adiciona o "type guard" para verificar o tipo do erro
      const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
      // AJUSTE 2: Usa a variável segura no log
      console.error('Erro na função admin-auth:', errorMessage);
      return new Response(// AJUSTE 3: Usa a variável segura na resposta JSON
      JSON.stringify({
        error: errorMessage
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  });
}
