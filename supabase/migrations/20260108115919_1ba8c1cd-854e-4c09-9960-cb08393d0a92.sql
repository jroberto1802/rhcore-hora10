-- Adicionar coluna status na tabela processos_seletivos
-- Os valores possíveis são: 'em_andamento', 'concluido', 'cancelado'
ALTER TABLE public.processos_seletivos 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento';

-- Atualizar registros existentes baseado na data_final
UPDATE public.processos_seletivos 
SET status = CASE 
  WHEN data_final IS NOT NULL THEN 'concluido'
  ELSE 'em_andamento'
END;