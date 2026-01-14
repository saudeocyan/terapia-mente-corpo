import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verifyAuth } from '../_shared/auth.ts';

// AJUSTE: Headers CORS atualizados para serem dinâmicos e completos
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
    // A autenticação está correta
    await verifyAuth(req);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await supabase
      .from('cpf_habilitado')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (error) throw error;
    
    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error('Erro em adm-visualizar-cpf:', error);

    const isAuthError = error.message.includes("Acesso não autorizado");
    const status = isAuthError ? 401 : 500;
    
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
