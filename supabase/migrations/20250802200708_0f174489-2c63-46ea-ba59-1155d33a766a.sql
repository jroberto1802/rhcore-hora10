-- Adicionar novos campos na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN cnpj TEXT,
ADD COLUMN fantasia TEXT,
ADD COLUMN razao_social TEXT;

-- Migrar dados existentes do campo nome para fantasia
UPDATE public.empresas 
SET fantasia = nome;

-- Remover o campo nome (após migração)
ALTER TABLE public.empresas 
DROP COLUMN nome;

-- Adicionar constraint para garantir que fantasia não seja nulo
ALTER TABLE public.empresas 
ALTER COLUMN fantasia SET NOT NULL;