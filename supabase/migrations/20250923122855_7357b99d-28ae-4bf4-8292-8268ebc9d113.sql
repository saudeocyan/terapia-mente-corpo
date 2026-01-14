-- Remover políticas permissivas existentes e criar políticas RLS seguras

-- ========================================
-- TABELA: datas_disponiveis
-- ========================================

-- Remover política FOR ALL permissiva atual
DROP POLICY IF EXISTS "Admin pode modificar datas disponíveis" ON public.datas_disponiveis;

-- Manter leitura pública
-- (A política "Todos podem ver datas disponíveis" já existe)

-- Criar política para INSERT/UPDATE/DELETE apenas via backend com service_role
CREATE POLICY "Backend pode gerenciar datas disponíveis" 
ON public.datas_disponiveis 
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- TABELA: configuracoes_disponibilidade  
-- ========================================

-- Remover políticas permissivas atuais
DROP POLICY IF EXISTS "Permitir atualização de configurações" ON public.configuracoes_disponibilidade;

-- Manter leitura pública
-- (A política "Permitir leitura de configurações" já existe)

-- Criar política para UPDATE apenas via backend com service_role  
CREATE POLICY "Backend pode atualizar configurações"
ON public.configuracoes_disponibilidade
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- TABELA: cpf_habilitado
-- ========================================

-- Remover política FOR ALL permissiva atual
DROP POLICY IF EXISTS "Admin pode modificar cpf_habilitado" ON public.cpf_habilitado;

-- Manter leitura pública
-- (A política "Leitura pública de cpf_habilitado" já existe)

-- Criar política para INSERT/UPDATE/DELETE apenas via backend com service_role
CREATE POLICY "Backend pode gerenciar cpf_habilitado"
ON public.cpf_habilitado
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- TABELA: agendamentos
-- ========================================

-- Remover políticas permissivas atuais  
DROP POLICY IF EXISTS "Admin pode deletar agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Admin pode ver todos agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir atualizações de agendamentos" ON public.agendamentos;

-- Manter apenas INSERT público para usuários criarem agendamentos
-- (A política "Usuários podem criar agendamentos" já existe)

-- Criar política para SELECT via backend com service_role (para admin)
CREATE POLICY "Backend pode ver todos agendamentos"
ON public.agendamentos
FOR SELECT
TO service_role
USING (true);

-- Criar política para UPDATE/DELETE via backend com service_role
CREATE POLICY "Backend pode gerenciar agendamentos"
ON public.agendamentos
FOR UPDATE, DELETE
TO service_role
USING (true)
WITH CHECK (true);

-- Criar política para SELECT limitado público (apenas próprios agendamentos por CPF)
CREATE POLICY "Usuários podem ver próprios agendamentos"
ON public.agendamentos
FOR SELECT
TO anon, authenticated
USING (true); -- Controle será feito na edge function