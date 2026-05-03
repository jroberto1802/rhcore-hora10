-- Create table for cargos
CREATE TABLE public.cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome_completo_cargo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo_cargo TEXT NOT NULL,
  salario NUMERIC NOT NULL,
  nivel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view cargos from their companies" 
ON public.cargos 
FOR SELECT 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = cargos.empresa_id
));

CREATE POLICY "Users can create cargos in their companies" 
ON public.cargos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = cargos.empresa_id
));

CREATE POLICY "Users can update cargos from their companies" 
ON public.cargos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = cargos.empresa_id
));

CREATE POLICY "Users can delete cargos from their companies" 
ON public.cargos 
FOR DELETE 
USING (EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = cargos.empresa_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cargos_updated_at
BEFORE UPDATE ON public.cargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();