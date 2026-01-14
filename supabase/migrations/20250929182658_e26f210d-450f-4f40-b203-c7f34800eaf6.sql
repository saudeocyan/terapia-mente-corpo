-- Adicionar coluna cancel_token_hash na tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN cancel_token_hash TEXT;

-- Criar índice para melhorar performance de busca por hash
CREATE INDEX idx_agendamentos_cancel_token_hash ON public.agendamentos(cancel_token_hash);

-- Comentário explicativo
COMMENT ON COLUMN public.agendamentos.cancel_token_hash IS 'Hash SHA-256 do token de cancelamento gerado no momento do agendamento';