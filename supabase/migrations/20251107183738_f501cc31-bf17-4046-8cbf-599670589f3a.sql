-- Criar tabela para planos de ação de desempenho
CREATE TABLE IF NOT EXISTS public.planos_acao_desempenho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  funcionario_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  descricao TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  prazo DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planos_acao_desempenho ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view planos_acao from their companies"
ON public.planos_acao_desempenho
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = planos_acao_desempenho.empresa_id
  )
);

CREATE POLICY "Users can create planos_acao in their companies"
ON public.planos_acao_desempenho
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = planos_acao_desempenho.empresa_id
  )
);

CREATE POLICY "Users can update planos_acao from their companies"
ON public.planos_acao_desempenho
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = planos_acao_desempenho.empresa_id
  )
);

CREATE POLICY "Users can delete planos_acao from their companies"
ON public.planos_acao_desempenho
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = planos_acao_desempenho.empresa_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_planos_acao_desempenho_updated_at
  BEFORE UPDATE ON public.planos_acao_desempenho
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();