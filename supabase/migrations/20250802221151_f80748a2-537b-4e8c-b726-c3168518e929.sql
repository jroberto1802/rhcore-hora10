-- Create treinamentos table
CREATE TABLE public.treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  titulo_treinamento TEXT NOT NULL,
  fornecedor TEXT,
  local TEXT,
  data_inicio DATE,
  data_termino DATE,
  duracao INTEGER, -- horas
  investimento NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view treinamentos from their companies" 
ON public.treinamentos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos.empresa_id
));

CREATE POLICY "Users can create treinamentos in their companies" 
ON public.treinamentos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos.empresa_id
));

CREATE POLICY "Users can update treinamentos from their companies" 
ON public.treinamentos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos.empresa_id
));

CREATE POLICY "Users can delete treinamentos from their companies" 
ON public.treinamentos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos.empresa_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_treinamentos_updated_at
  BEFORE UPDATE ON public.treinamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();