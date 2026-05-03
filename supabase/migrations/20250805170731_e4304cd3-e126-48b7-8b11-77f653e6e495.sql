-- Criar tabela para exames dos funcionários
CREATE TABLE public.exames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  nome_exame TEXT NOT NULL,
  data_realizacao DATE NOT NULL,
  data_validade DATE,
  observacoes TEXT,
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view exames from their companies" 
ON public.exames 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames.empresa_id
));

CREATE POLICY "Users can create exames in their companies" 
ON public.exames 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames.empresa_id
));

CREATE POLICY "Users can update exames from their companies" 
ON public.exames 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames.empresa_id
));

CREATE POLICY "Users can delete exames from their companies" 
ON public.exames 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames.empresa_id
));

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_exames_updated_at
BEFORE UPDATE ON public.exames
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();