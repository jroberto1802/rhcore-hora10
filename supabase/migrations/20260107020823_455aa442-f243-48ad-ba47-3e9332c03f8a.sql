-- Adicionar coluna total_liquido na tabela folha_pagamento
ALTER TABLE public.folha_pagamento
ADD COLUMN IF NOT EXISTS total_liquido numeric DEFAULT 0;