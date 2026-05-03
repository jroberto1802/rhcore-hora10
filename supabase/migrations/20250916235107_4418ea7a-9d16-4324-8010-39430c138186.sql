-- Criar nova tabela para períodos de gozo das férias
CREATE TABLE public.periodos_gozo_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ferias_id UUID NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.periodos_gozo_ferias ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view periodos_gozo_ferias from their companies" 
ON public.periodos_gozo_ferias 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.ferias f
  JOIN public.usuarios_empresas ue ON f.empresa_id = ue.empresa_id
  WHERE f.id = periodos_gozo_ferias.ferias_id 
  AND ue.user_id = auth.uid()
));

CREATE POLICY "Users can create periodos_gozo_ferias in their companies" 
ON public.periodos_gozo_ferias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ferias f
  JOIN public.usuarios_empresas ue ON f.empresa_id = ue.empresa_id
  WHERE f.id = periodos_gozo_ferias.ferias_id 
  AND ue.user_id = auth.uid()
));

CREATE POLICY "Users can update periodos_gozo_ferias from their companies" 
ON public.periodos_gozo_ferias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.ferias f
  JOIN public.usuarios_empresas ue ON f.empresa_id = ue.empresa_id
  WHERE f.id = periodos_gozo_ferias.ferias_id 
  AND ue.user_id = auth.uid()
));

CREATE POLICY "Users can delete periodos_gozo_ferias from their companies" 
ON public.periodos_gozo_ferias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.ferias f
  JOIN public.usuarios_empresas ue ON f.empresa_id = ue.empresa_id
  WHERE f.id = periodos_gozo_ferias.ferias_id 
  AND ue.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_periodos_gozo_ferias_updated_at
BEFORE UPDATE ON public.periodos_gozo_ferias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remover campos de data_inicio, data_retorno e dias da tabela ferias 
-- pois agora serão calculados a partir dos períodos de gozo
ALTER TABLE public.ferias 
DROP COLUMN IF EXISTS data_inicio,
DROP COLUMN IF EXISTS data_retorno,
DROP COLUMN IF EXISTS dias;

-- Renomear campo periodo_aquisitivo_retorno para periodo_aquisitivo_fim para ficar mais claro
ALTER TABLE public.ferias 
RENAME COLUMN periodo_aquisitivo_retorno TO periodo_aquisitivo_fim;