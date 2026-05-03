-- Criar tabela de ocorrências
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  data_ocorrencia DATE NOT NULL,
  usuario_responsavel_id UUID NOT NULL,
  tipo_ocorrencia TEXT NOT NULL,
  descricao TEXT NOT NULL,
  anexo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view ocorrencias from their companies"
ON public.ocorrencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = ocorrencias.empresa_id
  )
);

CREATE POLICY "Users can create ocorrencias in their companies"
ON public.ocorrencias
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = ocorrencias.empresa_id
  )
);

CREATE POLICY "Users can update ocorrencias from their companies"
ON public.ocorrencias
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = ocorrencias.empresa_id
  )
);

CREATE POLICY "Users can delete ocorrencias from their companies"
ON public.ocorrencias
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = ocorrencias.empresa_id
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ocorrencias_updated_at
BEFORE UPDATE ON public.ocorrencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();