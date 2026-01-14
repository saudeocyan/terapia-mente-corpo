-- Corrigir permissões para funcionalidade pública

-- Corrigir função validar_cpf_publico com search_path seguro
CREATE OR REPLACE FUNCTION public.validar_cpf_publico(cpf_param text)
RETURNS TABLE(cpf text, nome text, area text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT c.cpf, c.nome, c.area
  FROM public.cpf_habilitado c
  WHERE c.cpf = cpf_param;
$$;

-- Corrigir função update_updated_at_column com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Política mais flexível para cpf_habilitado: leitura pública, modificação autenticada
DROP POLICY IF EXISTS "Admin autenticado pode fazer tudo em cpf_habilitado" ON public.cpf_habilitado;

-- Permitir leitura pública para validação de CPF
CREATE POLICY "Leitura pública de cpf_habilitado" 
ON public.cpf_habilitado 
FOR SELECT 
USING (true);

-- Permitir modificação apenas para usuários autenticados
CREATE POLICY "Admin pode modificar cpf_habilitado" 
ON public.cpf_habilitado 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);