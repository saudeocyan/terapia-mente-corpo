-- Adicionar coluna nome à tabela cpf_habilitado
ALTER TABLE public.cpf_habilitado 
ADD COLUMN nome TEXT NOT NULL DEFAULT '';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_cpf_habilitado_nome ON public.cpf_habilitado(nome);