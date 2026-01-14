import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts"; // Importa o 'verify' diretamente

// 1. Headers CORS atualizados para ler o ALLOWED_ORIGIN e permitir tudo
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 2. LÓGICA DE AUTENTICAÇÃO MOVIDA PARA CÁ ---
    // (Esta lógica foi copiada do seu 'auth.ts')

    const JWT_SECRET_STRING = Deno.env.get('JWT_SECRET');
    if (!JWT_SECRET_STRING) {
      throw new Error("ERRO CRÍTICO: JWT_SECRET não configurado.");
    }

    const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
    const key = await crypto.subtle.importKey(
      "raw", secretKey, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]
    );

    const cookieHeader = req.headers.get('Cookie');
    if (!cookieHeader) {
      throw new Error("Acesso não autorizado: Cookie ausente.");
    }
    
    // Pega o último token em caso de duplicatas
    const tokenCookie = cookieHeader.split(';').map(c => c.trim()).filter(c => c.startsWith('admin_token=')).pop();
    if (!tokenCookie) {
      throw new Error("Acesso não autorizado: Token não encontrado.");
    }
    
    const token = tokenCookie.split('=')[1];
    if (!token) {
      throw new Error("Acesso não autorizado: Token inválido.");
    }
    
    // Verifica o token usando a chave preparada
    await verify(token, key, "HS256");
    // --- FIM DA LÓGICA DE AUTENTICAÇÃO ---


    // 3. Lógica principal da função (agora pode executar)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .order('criado_em', { ascending: false });
      
    if (error) throw error;
    
    return new Response(JSON.stringify(data || []), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    // 4. Tratamento de erro robusto
    console.error('Erro em adm-visualizar-agendamentos:', error);
    
    const isAuthError = error.message.includes("Acesso não autorizado") || error.message.includes("Token");
    const status = isAuthError ? 401 : 500;
    
    return new Response(JSON.stringify({ error: error.message }), { 
      status, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
