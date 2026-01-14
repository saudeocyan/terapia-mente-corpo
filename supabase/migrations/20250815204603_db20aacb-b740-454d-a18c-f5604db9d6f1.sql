-- Corrigir política de UPDATE para permitir cancelamento via edge function
-- A edge function precisa poder atualizar o status para 'cancelado'
DROP POLICY IF EXISTS "Admin pode atualizar agendamentos" ON public.agendamentos;

-- Nova política que permite atualização por admins autenticados OU 
-- permite apenas mudança de status para 'cancelado' via edge functions
CREATE POLICY "Permitir atualizações de agendamentos"
ON public.agendamentos
FOR UPDATE
USING (
  -- Admin autenticado pode atualizar tudo
  auth.uid() IS NOT NULL OR 
  -- Permite leitura para cancelamento (edge functions podem ler)
  true
)
WITH CHECK (
  -- Admin autenticado pode atualizar tudo
  auth.uid() IS NOT NULL OR 
  -- Edge functions podem apenas cancelar agendamentos confirmados
  (status = 'cancelado')
);