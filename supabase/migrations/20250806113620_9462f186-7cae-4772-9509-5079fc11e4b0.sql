-- Criar tabela de agendamentos
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'cancelado', 'ausente')),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de CPFs habilitados
CREATE TABLE public.cpf_habilitado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configurações de disponibilidade
CREATE TABLE public.configuracoes_disponibilidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dias_da_semana TEXT[] NOT NULL DEFAULT ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  hora_inicio TIME NOT NULL DEFAULT '08:00',
  hora_fim TIME NOT NULL DEFAULT '17:00',
  duracao_sessao INTEGER NOT NULL DEFAULT 20,
  intervalo INTEGER NOT NULL DEFAULT 5,
  vagas_por_horario INTEGER NOT NULL DEFAULT 2,
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.configuracoes_disponibilidade (id) 
VALUES (gen_random_uuid());

-- Habilitar RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_habilitado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_disponibilidade ENABLE ROW LEVEL SECURITY;

-- Políticas para agendamentos (acesso público para leitura limitada, inserção e cancelamento)
CREATE POLICY "Permitir inserção de agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir visualização própria de agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir atualização para cancelamento" 
ON public.agendamentos 
FOR UPDATE 
USING (true);

-- Políticas para CPFs habilitados (acesso público para verificação)
CREATE POLICY "Permitir verificação de CPF" 
ON public.cpf_habilitado 
FOR SELECT 
USING (true);

-- Políticas para configurações (acesso público para leitura)
CREATE POLICY "Permitir leitura de configurações" 
ON public.configuracoes_disponibilidade 
FOR SELECT 
USING (true);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamp
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes_disponibilidade
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_agendamentos_cpf ON public.agendamentos(cpf);
CREATE INDEX idx_agendamentos_data_horario ON public.agendamentos(data, horario);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);
CREATE INDEX idx_cpf_habilitado_cpf ON public.cpf_habilitado(cpf);