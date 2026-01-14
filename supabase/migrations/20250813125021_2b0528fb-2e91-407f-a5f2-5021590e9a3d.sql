-- Criar políticas para cpf_habilitado para permitir operações públicas
CREATE POLICY "Permitir todas operações em cpf_habilitado" 
ON public.cpf_habilitado 
FOR ALL 
USING (true) 
WITH CHECK (true);