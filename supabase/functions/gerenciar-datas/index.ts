import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts"; // Importa o 'verify' diretamente

// 1. Headers CORS atualizados para ler o ALLOWED_ORIGIN e permitir tudo
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' // Adicionado GET e POST
};

serve(async (req) => {
  // 2. Handler de OPTIONS corrigido para usar os headers dinâmicos
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 3. LÓGICA DE AUTENTICAÇÃO MOVIDA PARA CÁ ---
    const JWT_SECRET_STRING = Deno.env.get('JWT_SECRET');
    if (!JWT_SECRET_STRING) throw new Error("ERRO CRÍTICO: JWT_SECRET não configurado.");

    const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
    const key = await crypto.subtle.importKey(
      "raw", secretKey, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]
    );

    const cookieHeader = req.headers.get('Cookie');
    if (!cookieHeader) throw new Error("Acesso não autorizado: Cookie ausente.");
    
    const tokenCookie = cookieHeader.split(';').map(c => c.trim()).filter(c => c.startsWith('admin_token=')).pop();
    if (!tokenCookie) throw new Error("Acesso não autorizado: Token não encontrado.");
    
    const token = tokenCookie.split('=')[1];
    if (!token) throw new Error("Acesso não autorizado: Token inválido.");
    
    await verify(token, key, "HS256");
    // --- FIM DA LÓGICA DE AUTENTICAÇÃO ---

    // 4. Lógica de negócio da função (igual ao seu código antigo)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      const [{ data: datas, error: errorDatas }, { data: configuracoes, error: errorConfig }] = await Promise.all([
        supabase.from('datas_disponiveis').select('*').order('data', { ascending: true }),
        supabase.from('configuracoes_disponibilidade').select('*').limit(1).single()
      ]);

      if (errorDatas) {
        console.error('Erro ao listar datas:', errorDatas);
        return new Response(JSON.stringify({ error: 'Erro ao listar datas' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      // O erro de config é opcional, pode não existir config
      if (errorConfig && errorConfig.code !== 'PGRST116') {
        console.error('Erro ao listar config:', errorConfig);
      }

      return new Response(JSON.stringify({
        datas: datas || [],
        configuracoes: configuracoes || null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    if (req.method === 'POST') {
      const { acao, data, datas, ativo, configuracoes } = await req.json();

      if (acao === 'adicionar') {
        if (datas && datas.length > 0) {
          const { error: deleteError } = await supabase.from('datas_disponiveis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (deleteError) {
            return new Response(JSON.stringify({ error: 'Erro ao limpar datas anteriores', detalhes: deleteError.message }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          const datasParaInserir = datas.map((d: string) => ({ data: d, ativo: ativo ?? true }));
          const { data: resultData, error } = await supabase.from('datas_disponiveis').insert(datasParaInserir).select();
          if (error) {
            return new Response(JSON.stringify({ error: 'Erro ao adicionar datas', detalhes: error.message }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          return new Response(JSON.stringify({ sucesso: true, mensagem: `Datas substituídas com sucesso`, datas_adicionadas: resultData }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } else if (data) {
          // Lógica para adicionar uma única data...
        }
      } else if (acao === 'remover' && data) {
        // Lógica para remover data...
      } else if (acao === 'atualizar_configuracoes' && configuracoes) {
        // Lógica para atualizar configurações...
        const { data: configExistente } = await supabase.from('configuracoes_disponibilidade').select('id').limit(1).single();
        let result;
        if (configExistente) {
          result = await supabase.from('configuracoes_disponibilidade').update(configuracoes).eq('id', configExistente.id).select().single();
        } else {
          result = await supabase.from('configuracoes_disponibilidade').insert(configuracoes).select().single();
        }
        if (result.error) {
          return new Response(JSON.stringify({ error: 'Erro ao atualizar configurações' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        return new Response(JSON.stringify({ sucesso: true, mensagem: 'Configurações atualizadas', configuracoes: result.data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({ error: 'Ação inválida ou parâmetros insuficientes' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    // 5. Tratamento de erro robusto
    console.error('Erro em gerenciar-datas:', error);
    
    const isAuthError = error.message.includes("Acesso não autorizado") || error.message.includes("Token");
    const status = isAuthError ? 401 : 500;
    
    return new Response(JSON.stringify({ error: error.message }), { 
      status, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
