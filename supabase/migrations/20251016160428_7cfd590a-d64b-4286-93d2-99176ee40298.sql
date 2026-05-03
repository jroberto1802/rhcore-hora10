-- Adicionar coluna renovado na tabela treinamentos
ALTER TABLE public.treinamentos 
ADD COLUMN renovado BOOLEAN NOT NULL DEFAULT false;