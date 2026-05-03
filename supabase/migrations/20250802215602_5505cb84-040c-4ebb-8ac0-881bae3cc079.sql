-- Create alteracoes_salariais table
CREATE TABLE public.alteracoes_salariais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  data_alteracao DATE NOT NULL,
  motivo TEXT NOT NULL CHECK (motivo IN ('Promocao', 'AlteracaoSalarial')),
  cargo_anterior TEXT,
  salario_anterior NUMERIC,
  novo_cargo TEXT,
  novo_salario NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alteracoes_salariais ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view alteracoes_salariais from their companies" 
ON public.alteracoes_salariais 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = alteracoes_salariais.empresa_id
));

CREATE POLICY "Users can create alteracoes_salariais in their companies" 
ON public.alteracoes_salariais 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = alteracoes_salariais.empresa_id
));

CREATE POLICY "Users can update alteracoes_salariais from their companies" 
ON public.alteracoes_salariais 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = alteracoes_salariais.empresa_id
));

CREATE POLICY "Users can delete alteracoes_salariais from their companies" 
ON public.alteracoes_salariais 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = alteracoes_salariais.empresa_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alteracoes_salariais_updated_at
  BEFORE UPDATE ON public.alteracoes_salariais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();