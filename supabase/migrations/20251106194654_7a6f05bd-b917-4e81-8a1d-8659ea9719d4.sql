-- Create table for fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  tipo_fornecedor TEXT NOT NULL CHECK (tipo_fornecedor IN ('Alimentação', 'Manutenção', 'Administrativo', 'Outros')),
  descricao_servico TEXT,
  data_emissao DATE,
  data_vencimento DATE,
  valor_total NUMERIC NOT NULL,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado')),
  observacoes TEXT,
  
  -- Campos dinâmicos - Alimentação
  produto TEXT,
  quantidade NUMERIC,
  valor_unitario NUMERIC,
  periodo_fornecimento_inicio DATE,
  periodo_fornecimento_fim DATE,
  
  -- Campos dinâmicos - Manutenção
  tipo_servico TEXT,
  equipamento_area TEXT,
  data_execucao DATE,
  custo_mao_obra NUMERIC,
  custo_materiais NUMERIC,
  
  -- Campos dinâmicos - Administrativo
  tipo_despesa TEXT,
  competencia TEXT,
  valor_contratado NUMERIC,
  valor_pago NUMERIC,
  
  -- Campos dinâmicos - Outros
  periodo_referencia TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view fornecedores from their companies" 
ON public.fornecedores 
FOR SELECT 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = fornecedores.empresa_id
));

CREATE POLICY "Users can create fornecedores in their companies" 
ON public.fornecedores 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = fornecedores.empresa_id
));

CREATE POLICY "Users can update fornecedores from their companies" 
ON public.fornecedores 
FOR UPDATE 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = fornecedores.empresa_id
));

CREATE POLICY "Users can delete fornecedores from their companies" 
ON public.fornecedores 
FOR DELETE 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = fornecedores.empresa_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();