-- Create ferias table
CREATE TABLE public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  previsao BOOLEAN NOT NULL DEFAULT false,
  data_limite DATE,
  data_inicio DATE,
  data_retorno DATE,
  dias INTEGER,
  periodo_aquisitivo_inicio DATE,
  periodo_aquisitivo_retorno DATE,
  valor_ferias NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ferias
CREATE POLICY "Users can view ferias from their companies"
ON public.ferias
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = ferias.empresa_id
  )
);

CREATE POLICY "Users can create ferias in their companies"
ON public.ferias
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = ferias.empresa_id
  )
);

CREATE POLICY "Users can update ferias from their companies"
ON public.ferias
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = ferias.empresa_id
  )
);

CREATE POLICY "Users can delete ferias from their companies"
ON public.ferias
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = ferias.empresa_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_ferias_updated_at
BEFORE UPDATE ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();