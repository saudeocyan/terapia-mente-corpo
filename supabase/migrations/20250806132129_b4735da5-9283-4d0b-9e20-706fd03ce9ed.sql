-- Adicionar política RLS para permitir UPDATE em configuracoes_disponibilidade
CREATE POLICY "Permitir atualização de configurações" 
ON public.configuracoes_disponibilidade 
FOR UPDATE 
USING (true) 
WITH CHECK (true);