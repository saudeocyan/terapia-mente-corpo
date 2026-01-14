-- Add 'area' column to cpf_habilitado and agendamentos
ALTER TABLE public.cpf_habilitado
ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT '';

ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT '';

-- Optional index to help future dashboard queries by area
CREATE INDEX IF NOT EXISTS idx_agendamentos_area ON public.agendamentos(area);