-- Adicionar campo observacoes na tabela alteracoes_salariais
ALTER TABLE public.alteracoes_salariais ADD COLUMN IF NOT EXISTS observacoes text;

-- Adicionar campo documento_url na tabela demissoes
ALTER TABLE public.demissoes ADD COLUMN IF NOT EXISTS documento_url text;