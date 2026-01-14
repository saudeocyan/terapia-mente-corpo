-- Criar tabela para controlar datas disponíveis
CREATE TABLE public.datas_disponiveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.datas_disponiveis ENABLE ROW LEVEL SECURITY;

-- Política para datas disponíveis (acesso público completo para administração)
CREATE POLICY "Permitir todas operações em datas disponíveis" 
ON public.datas_disponiveis 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Adicionar trigger para atualizar timestamp
CREATE TRIGGER update_datas_disponiveis_updated_at
BEFORE UPDATE ON public.datas_disponiveis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para performance
CREATE INDEX idx_datas_disponiveis_data ON public.datas_disponiveis(data);
CREATE INDEX idx_datas_disponiveis_ativo ON public.datas_disponiveis(ativo);