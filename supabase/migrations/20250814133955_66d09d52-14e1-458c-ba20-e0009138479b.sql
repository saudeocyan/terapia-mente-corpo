-- Migração simplificada para autenticação única de admin

-- Remover a política atual muito permissiva da tabela cpf_habilitado
DROP POLICY IF EXISTS "Permitir todas operações em cpf_habilitado" ON public.cpf_habilitado;

-- Criar políticas RLS mais seguras para cpf_habilitado
-- Apenas usuários autenticados podem fazer qualquer operação
CREATE POLICY "Admin autenticado pode fazer tudo em cpf_habilitado" 
ON public.cpf_habilitado 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Criar função para validação de CPF (usada pelas edge functions)
CREATE OR REPLACE FUNCTION public.validar_cpf_publico(cpf_param text)
RETURNS TABLE(cpf text, nome text, area text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.cpf, c.nome, c.area
  FROM public.cpf_habilitado c
  WHERE c.cpf = cpf_param;
$$;

-- Política para permitir acesso público à função de validação
GRANT EXECUTE ON FUNCTION public.validar_cpf_publico(text) TO anon;

-- Atualizar políticas das outras tabelas para serem mais seguras
-- Remover políticas muito permissivas dos agendamentos
DROP POLICY IF EXISTS "Permitir todas operações em agendamentos" ON public.agendamentos;

-- Política para agendamentos: acesso público para criação, admin para tudo
CREATE POLICY "Usuários podem criar agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin pode ver todos agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (auth.uid() IS NOT NULL OR true); -- Permite leitura pública também

CREATE POLICY "Admin pode atualizar agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode deletar agendamentos" 
ON public.agendamentos 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Política para datas_disponiveis: leitura pública, modificação apenas por admin
DROP POLICY IF EXISTS "Permitir todas operações em datas disponíveis" ON public.datas_disponiveis;

CREATE POLICY "Todos podem ver datas disponíveis" 
ON public.datas_disponiveis 
FOR SELECT 
USING (true);

CREATE POLICY "Admin pode modificar datas disponíveis" 
ON public.datas_disponiveis 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);