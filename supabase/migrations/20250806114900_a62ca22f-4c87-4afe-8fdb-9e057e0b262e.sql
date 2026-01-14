-- Corrigir políticas RLS para permitir inserção e administração de CPFs
DROP POLICY IF EXISTS "Permitir verificação de CPF" ON public.cpf_habilitado;
DROP POLICY IF EXISTS "Permitir inserção de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir visualização própria de agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir atualização para cancelamento" ON public.agendamentos;

-- Políticas para CPFs habilitados (acesso público completo para administração)
CREATE POLICY "Permitir todas operações em CPF habilitado" 
ON public.cpf_habilitado 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Políticas para agendamentos (acesso público completo)
CREATE POLICY "Permitir todas operações em agendamentos" 
ON public.agendamentos 
FOR ALL 
USING (true)
WITH CHECK (true);