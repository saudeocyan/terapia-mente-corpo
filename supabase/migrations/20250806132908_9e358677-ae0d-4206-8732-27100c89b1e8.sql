-- Adicionar campos para configuração de pausa para almoço
ALTER TABLE public.configuracoes_disponibilidade 
ADD COLUMN pausa_almoco_ativa BOOLEAN DEFAULT false,
ADD COLUMN pausa_almoco_inicio TIME DEFAULT '12:00:00',
ADD COLUMN pausa_almoco_fim TIME DEFAULT '13:00:00';