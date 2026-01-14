-- Remover defaults fixos das colunas de horário para permitir configuração via admin
ALTER TABLE public.configuracoes_disponibilidade 
ALTER COLUMN hora_inicio DROP DEFAULT;

ALTER TABLE public.configuracoes_disponibilidade 
ALTER COLUMN hora_fim DROP DEFAULT;