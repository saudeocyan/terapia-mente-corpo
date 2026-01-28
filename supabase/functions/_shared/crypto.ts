
export const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '', // Fail safe to empty string if not set, preventing wildcard
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Credentials': 'true',
};

export async function hashCpf(cpf: string): Promise<string> {
    const pepper = Deno.env.get('CPF_PEPPER_SECRET');
    if (!pepper) {
        throw new Error('CONFIG_ERROR: CPF_PEPPER_SECRET is not set');
    }

    // Clean CPF (digits only)
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Combine with Pepper
    const dataToHash = cpfLimpo + pepper;

    const msgBuffer = new TextEncoder().encode(dataToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
