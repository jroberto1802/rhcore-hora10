-- Adicionar colunas para nome livre de fornecedor, tipo de pagamento livre e pessoa de contato

-- Adicionar fornecedor_nome para pagamentos com nome livre (sem cadastro)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pagamentos_fornecedores' AND column_name = 'fornecedor_nome') THEN
    ALTER TABLE public.pagamentos_fornecedores ADD COLUMN fornecedor_nome TEXT;
  END IF;
END $$;

-- Adicionar tipo_pagamento como texto livre
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pagamentos_fornecedores' AND column_name = 'tipo_pagamento') THEN
    ALTER TABLE public.pagamentos_fornecedores ADD COLUMN tipo_pagamento TEXT;
  END IF;
END $$;

-- Adicionar coluna nota_fiscal booleana se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pagamentos_fornecedores' AND column_name = 'nota_fiscal') THEN
    ALTER TABLE public.pagamentos_fornecedores ADD COLUMN nota_fiscal BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Permitir fornecedor_id ser NULL para pagamentos com nome livre
ALTER TABLE public.pagamentos_fornecedores ALTER COLUMN fornecedor_id DROP NOT NULL;

-- Adicionar pessoa_contato ao fornecedor
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fornecedores' AND column_name = 'pessoa_contato') THEN
    ALTER TABLE public.fornecedores ADD COLUMN pessoa_contato TEXT;
  END IF;
END $$;

-- Criar índice para busca por nome livre
CREATE INDEX IF NOT EXISTS idx_pagamentos_fornecedor_nome ON public.pagamentos_fornecedores(fornecedor_nome);

-- Comentários explicativos
COMMENT ON COLUMN public.pagamentos_fornecedores.fornecedor_nome IS 'Nome livre do fornecedor quando não há cadastro prévio';
COMMENT ON COLUMN public.pagamentos_fornecedores.tipo_pagamento IS 'Tipo de pagamento definido livremente pelo usuário';
COMMENT ON COLUMN public.pagamentos_fornecedores.nota_fiscal IS 'Indica se o pagamento possui nota fiscal ou recibo';
COMMENT ON COLUMN public.fornecedores.pessoa_contato IS 'Nome da pessoa de contato do fornecedor';