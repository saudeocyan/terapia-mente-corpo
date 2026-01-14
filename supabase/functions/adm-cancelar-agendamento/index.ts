import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://shiatsu-zen-schedule-supabase.lovable.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Configuração do JWT
const JWT_SECRET_STRING = Deno.env.get('JWT_SECRET');
if (!JWT_SECRET_STRING) {
  throw new Error("ERRO CRÍTICO: JWT_SECRET não configurado!");
}

const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
const key = await crypto.subtle.importKey(
  "raw", 
  secretKey, 
  { name: "HMAC", hash: "SHA-256" }, 
  true, 
  ["sign", "verify"]
);

// Função de autenticação inline
async function verifyAuth(req: Request) {
  console.log('=== VERIFICANDO AUTENTICAÇÃO ===');
  const cookieHeader = req.headers.get('Cookie');
  
  if (!cookieHeader) {
    throw new Error("Acesso não autorizado: Cookie ausente.");
  }
  
  const allTokenCookies = cookieHeader.split(';')
    .map(c => c.trim())
    .filter(c => c.startsWith('admin_token='));
  
  if (allTokenCookies.length === 0) {
    throw new Error("Acesso não autorizado: Token não encontrado.");
  }
  
  const tokenCookie = allTokenCookies[allTokenCookies.length - 1];
  const token = tokenCookie.substring('admin_token='.length);
  
  try {
    await verify(token, key, { algorithm: "HS256" });
    console.log('✓ Token verificado com sucesso');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Token inválido';
    console.error('✗ Erro ao verificar token:', errorMsg);
    throw new Error(`Token inválido: ${errorMsg}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log('=== ADM-CANCELAR-AGENDAMENTO INICIADO ===');
    
    // Verificar autenticação
    await verifyAuth(req);
    
    // Parse body
    const { agendamento_id } = await req.json();
    console.log('Agendamento ID recebido:', agendamento_id);
    
    if (!agendamento_id) {
      console.error('✗ ID do agendamento não fornecido');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ID do agendamento não fornecido' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verificar se o agendamento existe antes de deletar
    const { data: agendamentoExistente, error: checkError } = await supabase
      .from('agendamentos')
      .select('id, nome, data, horario')
      .eq('id', agendamento_id)
      .maybeSingle();
    
    if (checkError) {
      console.error('✗ Erro ao verificar agendamento:', checkError);
      throw checkError;
    }
    
    if (!agendamentoExistente) {
      console.error('✗ Agendamento não encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Agendamento não encontrado' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    console.log('Agendamento encontrado:', agendamentoExistente);
    
    // Deletar o agendamento
    const { error: deleteError } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', agendamento_id);
      
    if (deleteError) {
      console.error('✗ Erro ao deletar agendamento:', deleteError);
      throw deleteError;
    }
    
    console.log('✓ Agendamento deletado com sucesso');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Agendamento cancelado com sucesso',
        agendamento: agendamentoExistente
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('✗ Erro geral:', errorMsg);
    
    const statusCode = errorMsg.includes('não autorizado') || errorMsg.includes('Token') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg 
      }), 
      { 
        status: statusCode, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
