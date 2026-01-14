// ARQUIVO: supabase/functions/_shared/auth.ts
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts";

const JWT_SECRET_STRING = Deno.env.get('JWT_SECRET');

if (!JWT_SECRET_STRING) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente JWT_SECRET não está configurada!");
}

const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
const key = await crypto.subtle.importKey(
  "raw", secretKey, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]
);

export async function verifyAuth(req: Request) {
  console.log('=== DEBUG AUTH ===');
  const cookieHeader = req.headers.get('Cookie');
  console.log('Cookie header:', cookieHeader);
  
  if (!cookieHeader) throw new Error("Acesso não autorizado: Cookie ausente.");
  
  // Pega todos os cookies admin_token e usa o último (mais recente)
  const allTokenCookies = cookieHeader.split(';')
    .map(c => c.trim())
    .filter(c => c.startsWith('admin_token='));
  
  console.log(`Encontrados ${allTokenCookies.length} cookies admin_token`);
  
  if (allTokenCookies.length === 0) {
    throw new Error("Acesso não autorizado: Token não encontrado.");
  }
  
  // Usa o último token (mais recente)
  const tokenCookie = allTokenCookies[allTokenCookies.length - 1];
  console.log('Token cookie selecionado:', tokenCookie.substring(0, 50));
  
  // Pega o valor após 'admin_token='
  const token = tokenCookie.substring('admin_token='.length);
  console.log('Token extraído (primeiros 50 chars):', token.substring(0, 50));
  
  try {
    await verify(token, key, "HS256");
    console.log('Token verificado com sucesso!');
  } catch (error) {
    console.error('Erro ao verificar token:', error.message);
    throw new Error(`Token inválido: ${error.message}`);
  }
  console.log('=== FIM DEBUG AUTH ===');
}
