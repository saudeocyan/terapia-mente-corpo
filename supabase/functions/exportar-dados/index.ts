// 1. AJUSTE DE IMPORT: Usando versões compatíveis e auth manual
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"; // Versão compatível
import { createClient, SupabaseClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts"; // Versão compatível
// REMOVIDO: import { parse } from "https://deno.land/std@0.208.0/cookie/mod.ts";

// 2. AJUSTE DE CORS: Usar variável de ambiente e permitir credenciais (mantido)
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const JWT_SECRET = Deno.env.get('JWT_SECRET');

// 3. ADICIONADO: Função auxiliar para extrair cookie (igual à de delete_cpf)
function getCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${name}=`));
  return targetCookie ? targetCookie.substring(name.length + 1) : undefined;
}

// Função auxiliar para converter dados em CSV (sem alterações)
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return "";
  }
  // Extrai cabeçalhos da primeira linha de dados
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Cabeçalho
    ...data.map(row =>
      headers.map(header =>
        // Usa JSON.stringify para lidar com vírgulas e aspas dentro dos valores
        JSON.stringify(row[header], (_, value) => value ?? '') // Trata nulos como string vazia
      ).join(',')
    )
  ];
  return csvRows.join('\n');
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 4. AJUSTE DE AUTH: Lógica de verificação manual do cookie (usa getCookie)
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET não está configurado.");
    }
    const cookieHeader = req.headers.get('Cookie'); // Pega o header Cookie
    const token = getCookie(cookieHeader, 'admin_token'); // Usa a função auxiliar
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

    // --- Autenticação bem-sucedida, lógica da função continua ---

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extrai parâmetros do corpo da requisição (JSON)
    const { data_inicio, data_fim, status, cpf, formato } = await req.json();

    // Consulta a VIEW 'todos_os_agendamentos' (mantido)
    let query = supabase
      .from('todos_os_agendamentos')
      .select('cpf, nome, data, horario, status, area, criado_em')
      .order('data', { ascending: true })
      .order('horario', { ascending: true });

    // Aplica filtros (mantido)
    if (data_inicio) {
      query = query.gte('data', data_inicio);
    }
    if (data_fim) {
      query = query.lte('data', data_fim);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (cpf) {
      query = query.eq('cpf', cpf);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao consultar agendamentos (VIEW):', error.message);
      throw error; // Lança para o catch principal
    }

    // Formata a resposta (mantido)
    if (formato === 'csv') {
      const csvData = convertToCSV(data || []); // Passa array vazio se data for null
      const csvHeaders = {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="agendamentos_completos.csv"',
      };
      return new Response(csvData, { status: 200, headers: csvHeaders });
    } else {
      // Padrão é JSON
      return new Response(JSON.stringify(data || []), { // Retorna array vazio se data for null
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  // 5. AJUSTE NO CATCH: Adicionado "type guard" (mantido)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
    console.error('Erro na função exportar-dados:', errorMessage);

    const status = errorMessage.includes("Acesso não autorizado") || errorMessage.includes("Token inválido") || errorMessage.includes("signature") ? 401 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
