-- Passo 1: Adicionar novos campos na tabela funcionarios
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS fardamento TEXT;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS email_corporativo TEXT;