
CREATE TABLE public.ocorrencias_gerais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  titulo TEXT NOT NULL,
  tipo_ocorrencia TEXT NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  observacoes TEXT,
  criado_por_id UUID REFERENCES auth.users(id),
  criado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ocorrencias_gerais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ocorrencias_gerais from their companies"
ON public.ocorrencias_gerais FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ocorrencias_gerais.empresa_id
));

CREATE POLICY "Users can create ocorrencias_gerais in their companies"
ON public.ocorrencias_gerais FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ocorrencias_gerais.empresa_id
));

CREATE POLICY "Users can update ocorrencias_gerais from their companies"
ON public.ocorrencias_gerais FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ocorrencias_gerais.empresa_id
));

CREATE POLICY "Users can delete ocorrencias_gerais from their companies"
ON public.ocorrencias_gerais FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ocorrencias_gerais.empresa_id
));

CREATE INDEX idx_ocorrencias_gerais_empresa_id ON public.ocorrencias_gerais(empresa_id);
CREATE INDEX idx_ocorrencias_gerais_tipo ON public.ocorrencias_gerais(tipo_ocorrencia);
CREATE INDEX idx_ocorrencias_gerais_data ON public.ocorrencias_gerais(data);
