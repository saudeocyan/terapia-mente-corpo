-- ========================================
-- SECURITY HARDENING: STRICT RLS
-- ========================================

-- 1. Revoke existing overly permissive policies

-- Agendamentos
DROP POLICY IF EXISTS "Permitir inserção de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir visualização própria de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir atualização para cancelamento" ON public.agendamentos;

-- CPF Habilitado
DROP POLICY IF EXISTS "Permitir verificação de CPF" ON public.cpf_habilitado;

-- Configuracoes (Keep public read as per requirements, but being explicit)
DROP POLICY IF EXISTS "Permitir leitura de configurações" ON public.configuracoes_disponibilidade;

-- 2. Create new Strict Policies

-- Public Read for Configurations is acceptable
CREATE POLICY "Public Read Configs"
ON public.configuracoes_disponibilidade
FOR SELECT
TO anon, authenticated
USING (true);

-- DENY ALL for Agendamentos and CPF Habilitado
-- Access is now restricted to Service Role (Edge Functions)
-- We explicitly do NOT create policies for 'anon' or 'authenticated' for these tables,
-- which means default deny.

-- If we needed specific authenticated access (e.g. admin user viewing dashboard via client), 
-- we would add it here. BUT the task says "Access ... EXCLUSIVAMENTE através das Edge Functions".
-- So no policies = Service Role Only.

-- Double check that RLS is enabled
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_habilitado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_disponibilidade ENABLE ROW LEVEL SECURITY;
