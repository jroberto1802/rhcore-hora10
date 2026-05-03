-- Create new table for supplier payments/expenses
CREATE TABLE IF NOT EXISTS public.pagamentos_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  
  -- Payment details
  descricao_servico TEXT,
  data_emissao DATE,
  data_vencimento DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  observacoes TEXT,
  
  -- Dynamic fields based on supplier type
  -- Alimentação
  produto TEXT,
  quantidade NUMERIC,
  valor_unitario NUMERIC,
  periodo_fornecimento_inicio DATE,
  periodo_fornecimento_fim DATE,
  
  -- Manutenção
  tipo_servico TEXT,
  equipamento_area TEXT,
  data_execucao DATE,
  custo_mao_obra NUMERIC,
  custo_materiais NUMERIC,
  
  -- Administrativo
  tipo_despesa TEXT,
  competencia TEXT,
  valor_contratado NUMERIC,
  valor_pago NUMERIC,
  
  -- Outros
  periodo_referencia TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for pagamentos_fornecedores
ALTER TABLE public.pagamentos_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pagamentos from their companies"
  ON public.pagamentos_fornecedores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = pagamentos_fornecedores.empresa_id
    )
  );

CREATE POLICY "Users can create pagamentos in their companies"
  ON public.pagamentos_fornecedores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = pagamentos_fornecedores.empresa_id
    )
  );

CREATE POLICY "Users can update pagamentos from their companies"
  ON public.pagamentos_fornecedores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = pagamentos_fornecedores.empresa_id
    )
  );

CREATE POLICY "Users can delete pagamentos from their companies"
  ON public.pagamentos_fornecedores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = pagamentos_fornecedores.empresa_id
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_pagamentos_fornecedores_updated_at
  BEFORE UPDATE ON public.pagamentos_fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Simplify fornecedores table - remove payment-specific fields
-- Keep only basic supplier information
ALTER TABLE public.fornecedores 
  DROP COLUMN IF EXISTS descricao_servico,
  DROP COLUMN IF EXISTS data_emissao,
  DROP COLUMN IF EXISTS data_vencimento,
  DROP COLUMN IF EXISTS valor_total,
  DROP COLUMN IF EXISTS forma_pagamento,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS observacoes,
  DROP COLUMN IF EXISTS produto,
  DROP COLUMN IF EXISTS quantidade,
  DROP COLUMN IF EXISTS valor_unitario,
  DROP COLUMN IF EXISTS periodo_fornecimento_inicio,
  DROP COLUMN IF EXISTS periodo_fornecimento_fim,
  DROP COLUMN IF EXISTS tipo_servico,
  DROP COLUMN IF EXISTS equipamento_area,
  DROP COLUMN IF EXISTS data_execucao,
  DROP COLUMN IF EXISTS custo_mao_obra,
  DROP COLUMN IF EXISTS custo_materiais,
  DROP COLUMN IF EXISTS tipo_despesa,
  DROP COLUMN IF EXISTS competencia,
  DROP COLUMN IF EXISTS valor_contratado,
  DROP COLUMN IF EXISTS valor_pago,
  DROP COLUMN IF EXISTS periodo_referencia;

-- Add contact field to fornecedores
ALTER TABLE public.fornecedores 
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;