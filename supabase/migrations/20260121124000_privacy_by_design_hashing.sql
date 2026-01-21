-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. MIGRATION: Agendamentos
-- ========================================

-- Add hash column
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS cpf_hash text;

-- Populate hash column from existing data (cleaning non-digits)
UPDATE public.agendamentos
SET cpf_hash = encode(digest(regexp_replace(cpf, '\D', '', 'g'), 'sha256'), 'hex');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_cpf_hash ON public.agendamentos(cpf_hash);

-- Start migration for logic before dropping columns to ensure we don't break things mid-script if possible, 
-- but we need to drop columns to be "privacy by design".

-- ========================================
-- 2. MIGRATION: CPF Habilitado
-- ========================================

-- Add hash column
ALTER TABLE public.cpf_habilitado 
ADD COLUMN IF NOT EXISTS cpf_hash text;

-- Populate hash column
UPDATE public.cpf_habilitado
SET cpf_hash = encode(digest(regexp_replace(cpf, '\D', '', 'g'), 'sha256'), 'hex');

-- Create index
CREATE INDEX IF NOT EXISTS idx_cpf_habilitado_cpf_hash ON public.cpf_habilitado(cpf_hash);

-- ========================================
-- 3. FUNCTIONS (RPC)
-- ========================================

-- Drop old functions (if they exist, signatures matched from usage)
DROP FUNCTION IF EXISTS public.consultar_agendamentos_cpf(text);
DROP FUNCTION IF EXISTS public.cancelar_agendamento_usuario(uuid, text);

-- New Consultar Agendamentos (Search by CPF Hash)
CREATE OR REPLACE FUNCTION public.consultar_agendamentos_cpf(cpf_busca text)
RETURNS SETOF public.agendamentos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hash_busca text;
BEGIN
  -- Clean and hash the input CPF
  hash_busca := encode(digest(regexp_replace(cpf_busca, '\D', '', 'g'), 'sha256'), 'hex');
  
  RETURN QUERY 
  SELECT * 
  FROM public.agendamentos 
  WHERE cpf_hash = hash_busca
  ORDER BY data DESC, horario ASC;
END;
$$;

-- New Cancelar Agendamento (Verify ownership via Hash)
CREATE OR REPLACE FUNCTION public.cancelar_agendamento_usuario(agendamento_id uuid, cpf_confirmacao text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hash_confirmacao text;
  v_agendamento public.agendamentos%ROWTYPE;
BEGIN
  -- Clean and hash the input CPF
  hash_confirmacao := encode(digest(regexp_replace(cpf_confirmacao, '\D', '', 'g'), 'sha256'), 'hex');
  
  -- Check if booking exists and belongs to the hash
  SELECT * INTO v_agendamento
  FROM public.agendamentos
  WHERE id = agendamento_id AND cpf_hash = hash_confirmacao;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Agendamento não encontrado ou CPF incorreto.');
  END IF;

  -- Update status
  UPDATE public.agendamentos
  SET status = 'cancelado',
      atualizado_em = now()
  WHERE id = agendamento_id;

  RETURN json_build_object('success', true, 'message', 'Agendamento cancelado com sucesso.');
END;
$$;

-- New Admin RPC: Manage CPF Habilitado (Insert/Delete)
CREATE OR REPLACE FUNCTION public.manage_cpf_habilitado(
  action_type text, 
  cpf_param text, 
  nome_param text DEFAULT NULL, 
  area_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hash_cpf text;
BEGIN
  -- Clean and hash
  hash_cpf := encode(digest(regexp_replace(cpf_param, '\D', '', 'g'), 'sha256'), 'hex');

  IF action_type = 'insert' THEN
    -- Check for duplicates
    IF EXISTS (SELECT 1 FROM public.cpf_habilitado WHERE cpf_hash = hash_cpf) THEN
       RETURN json_build_object('success', false, 'error', 'CPF já cadastrado.');
    END IF;

    INSERT INTO public.cpf_habilitado (cpf_hash, nome, area)
    VALUES (hash_cpf, nome_param, area_param);
    
    RETURN json_build_object('success', true, 'message', 'CPF adicionado com sucesso.');

  ELSIF action_type = 'delete' THEN
    DELETE FROM public.cpf_habilitado WHERE cpf_hash = hash_cpf;
    RETURN json_build_object('success', true, 'message', 'CPF removido com sucesso.');
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Ação inválida.');
  END IF;
END;
$$;

-- ========================================
-- 4. CLEANUP (Drop Plain Text Columns)
-- ========================================

-- Only drop after data is migrated
ALTER TABLE public.agendamentos DROP COLUMN IF EXISTS cpf;
-- Handle agendamentos_historico table (Create or Migrate)
DO $$
BEGIN
    -- 1. If table doesn't exist, create it with NEW schema (cpf_hash)
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agendamentos_historico') THEN
        CREATE TABLE public.agendamentos_historico (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            nome TEXT,
            cpf_hash TEXT,
            data DATE,
            horario TIME without time zone,
            status TEXT,
            area TEXT,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    ELSE
        -- 2. If table exists, check for 'cpf' column and migrate if needed
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agendamentos_historico' AND column_name = 'cpf') THEN
             ALTER TABLE public.agendamentos_historico ADD COLUMN IF NOT EXISTS cpf_hash text;
             UPDATE public.agendamentos_historico SET cpf_hash = encode(digest(regexp_replace(cpf, '\D', '', 'g'), 'sha256'), 'hex') WHERE cpf_hash IS NULL;
             DROP INDEX IF EXISTS idx_agendamentos_historico_cpf_hash; -- Prevent dup error if re-running
             CREATE INDEX idx_agendamentos_historico_cpf_hash ON public.agendamentos_historico(cpf_hash);
             ALTER TABLE public.agendamentos_historico DROP COLUMN IF EXISTS cpf;
        ELSE
             -- 3. If table exists but has no 'cpf', ensure 'cpf_hash' exists
             ALTER TABLE public.agendamentos_historico ADD COLUMN IF NOT EXISTS cpf_hash text;
        END IF;
    END IF;
END $$;

-- Update validar_cpf_publico to use hash
-- Drop first because return type signature is changing (cpf -> cpf_hash)
DROP FUNCTION IF EXISTS public.validar_cpf_publico(text);

CREATE OR REPLACE FUNCTION public.validar_cpf_publico(cpf_param text)
RETURNS TABLE(cpf_hash text, nome text, area text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  hash_busca text;
BEGIN
  hash_busca := encode(digest(regexp_replace(cpf_param, '\D', '', 'g'), 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT c.cpf_hash, c.nome, c.area
  FROM public.cpf_habilitado c
  WHERE c.cpf_hash = hash_busca;
END;
$$;

