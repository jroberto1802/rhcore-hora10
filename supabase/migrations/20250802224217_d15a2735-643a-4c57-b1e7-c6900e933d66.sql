-- Create table for absenteísmo e ausências
CREATE TABLE public.ausencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  tipo_ausencia TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  justificada BOOLEAN NOT NULL DEFAULT false,
  atestado_medico BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ausencias
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;

-- Create policies for ausencias
CREATE POLICY "Users can view ausencias from their companies" 
ON public.ausencias 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ausencias.empresa_id
));

CREATE POLICY "Users can create ausencias in their companies" 
ON public.ausencias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ausencias.empresa_id
));

CREATE POLICY "Users can update ausencias from their companies" 
ON public.ausencias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ausencias.empresa_id
));

CREATE POLICY "Users can delete ausencias from their companies" 
ON public.ausencias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = ausencias.empresa_id
));

-- Create trigger for ausencias
CREATE TRIGGER update_ausencias_updated_at
BEFORE UPDATE ON public.ausencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for advertências e suspensões
CREATE TABLE public.advertencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  data_ocorrencia DATE NOT NULL,
  tipo_ocorrencia TEXT NOT NULL,
  dias_penalidade INTEGER,
  motivo_penalidade TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for advertencias
ALTER TABLE public.advertencias ENABLE ROW LEVEL SECURITY;

-- Create policies for advertencias
CREATE POLICY "Users can view advertencias from their companies" 
ON public.advertencias 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = advertencias.empresa_id
));

CREATE POLICY "Users can create advertencias in their companies" 
ON public.advertencias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = advertencias.empresa_id
));

CREATE POLICY "Users can update advertencias from their companies" 
ON public.advertencias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = advertencias.empresa_id
));

CREATE POLICY "Users can delete advertencias from their companies" 
ON public.advertencias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = advertencias.empresa_id
));

-- Create trigger for advertencias
CREATE TRIGGER update_advertencias_updated_at
BEFORE UPDATE ON public.advertencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for demissões
CREATE TABLE public.demissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  data_demissao DATE NOT NULL,
  motivo_desligamento TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for demissoes
ALTER TABLE public.demissoes ENABLE ROW LEVEL SECURITY;

-- Create policies for demissoes
CREATE POLICY "Users can view demissoes from their companies" 
ON public.demissoes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = demissoes.empresa_id
));

CREATE POLICY "Users can create demissoes in their companies" 
ON public.demissoes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = demissoes.empresa_id
));

CREATE POLICY "Users can update demissoes from their companies" 
ON public.demissoes 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = demissoes.empresa_id
));

CREATE POLICY "Users can delete demissoes from their companies" 
ON public.demissoes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = demissoes.empresa_id
));

-- Create trigger for demissoes
CREATE TRIGGER update_demissoes_updated_at
BEFORE UPDATE ON public.demissoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();