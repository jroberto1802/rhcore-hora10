-- Adicionar campo solicitante e tornar nome_processo opcional
ALTER TABLE public.processos_seletivos
ADD COLUMN solicitante TEXT;

-- Tornar nome_processo nullable (campo não será mais usado)
ALTER TABLE public.processos_seletivos
ALTER COLUMN nome_processo DROP NOT NULL;