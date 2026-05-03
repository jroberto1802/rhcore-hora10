-- Criar tabela de folha de pagamento
CREATE TABLE public.folha_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  vale_transporte BOOLEAN NOT NULL DEFAULT false,
  auxilio_transporte NUMERIC(12,2) NOT NULL DEFAULT 0,
  produtividade NUMERIC(12,2) NOT NULL DEFAULT 0,
  ajuda_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  horas_extras NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_horas_extras NUMERIC(12,2) NOT NULL DEFAULT 0,
  adicionais NUMERIC(12,2) NOT NULL DEFAULT 0,
  faltas INTEGER NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que só existe um registro por funcionário/mês/ano
  CONSTRAINT folha_pagamento_unique UNIQUE (funcionario_id, ano, mes)
);

-- Criar índices para performance
CREATE INDEX idx_folha_pagamento_empresa ON public.folha_pagamento(empresa_id);
CREATE INDEX idx_folha_pagamento_funcionario ON public.folha_pagamento(funcionario_id);
CREATE INDEX idx_folha_pagamento_periodo ON public.folha_pagamento(ano, mes);

-- Enable RLS
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;

-- Política de acesso: usuários podem ver folha das empresas às quais têm acesso
CREATE POLICY "Users can view folha_pagamento from their companies"
ON public.folha_pagamento
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = folha_pagamento.empresa_id
  )
);

-- Política de inserção
CREATE POLICY "Users with permission can insert folha_pagamento"
ON public.folha_pagamento
FOR INSERT
WITH CHECK (
  public.has_permission(auth.uid(), empresa_id, 'pag.folha.editar')
  OR public.is_super_admin(auth.uid(), empresa_id)
);

-- Política de atualização
CREATE POLICY "Users with permission can update folha_pagamento"
ON public.folha_pagamento
FOR UPDATE
USING (
  public.has_permission(auth.uid(), empresa_id, 'pag.folha.editar')
  OR public.is_super_admin(auth.uid(), empresa_id)
);

-- Política de exclusão
CREATE POLICY "Users with permission can delete folha_pagamento"
ON public.folha_pagamento
FOR DELETE
USING (
  public.has_permission(auth.uid(), empresa_id, 'pag.folha.excluir')
  OR public.is_super_admin(auth.uid(), empresa_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_folha_pagamento_updated_at
BEFORE UPDATE ON public.folha_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();