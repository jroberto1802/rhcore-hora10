-- Add funcoes field to candidatos table
ALTER TABLE public.candidatos 
ADD COLUMN funcoes text[] DEFAULT '{}';

-- Add index for better search performance
CREATE INDEX idx_candidatos_funcoes ON public.candidatos USING GIN(funcoes);