-- Create enum for competencia type
CREATE TYPE public.tipo_competencia AS ENUM ('Individual', 'Equipe', 'Organizacional');

-- Create enum for potencial
CREATE TYPE public.potencial_colaborador AS ENUM ('Alto', 'Médio', 'Baixo');

-- Create table for competencias
CREATE TABLE public.competencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo tipo_competencia NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for niveis_importancia
CREATE TABLE public.niveis_importancia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  peso NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for mapeamento_competencias_cargos
CREATE TABLE public.mapeamento_competencias_cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  cargo_id UUID NOT NULL,
  competencia_id UUID NOT NULL,
  nivel_importancia_id UUID NOT NULL,
  peso NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cargo_id, competencia_id)
);

-- Create table for avaliacoes_desempenho
CREATE TABLE public.avaliacoes_desempenho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  avaliador_id UUID NOT NULL,
  avaliado_id UUID NOT NULL,
  data_avaliacao DATE NOT NULL,
  cargo_avaliado TEXT NOT NULL,
  potencial potencial_colaborador NOT NULL,
  desempenho_medio_ponderado NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for competencias_avaliadas
CREATE TABLE public.competencias_avaliadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id UUID NOT NULL,
  competencia_id UUID NOT NULL,
  nivel_importancia_id UUID NOT NULL,
  peso NUMERIC NOT NULL,
  nota NUMERIC NOT NULL CHECK (nota >= 0 AND nota <= 5),
  pontuacao_ponderada NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveis_importancia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapeamento_competencias_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_avaliadas ENABLE ROW LEVEL SECURITY;

-- Create policies for competencias
CREATE POLICY "Users can view competencias from their companies"
ON public.competencias FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = competencias.empresa_id
  )
);

CREATE POLICY "Users can create competencias in their companies"
ON public.competencias FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = competencias.empresa_id
  )
);

CREATE POLICY "Users can update competencias from their companies"
ON public.competencias FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = competencias.empresa_id
  )
);

CREATE POLICY "Users can delete competencias from their companies"
ON public.competencias FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = competencias.empresa_id
  )
);

-- Create policies for niveis_importancia
CREATE POLICY "Users can view niveis_importancia from their companies"
ON public.niveis_importancia FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = niveis_importancia.empresa_id
  )
);

CREATE POLICY "Users can create niveis_importancia in their companies"
ON public.niveis_importancia FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = niveis_importancia.empresa_id
  )
);

CREATE POLICY "Users can update niveis_importancia from their companies"
ON public.niveis_importancia FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = niveis_importancia.empresa_id
  )
);

CREATE POLICY "Users can delete niveis_importancia from their companies"
ON public.niveis_importancia FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = niveis_importancia.empresa_id
  )
);

-- Create policies for mapeamento_competencias_cargos
CREATE POLICY "Users can view mapeamento_competencias_cargos from their companies"
ON public.mapeamento_competencias_cargos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = mapeamento_competencias_cargos.empresa_id
  )
);

CREATE POLICY "Users can create mapeamento_competencias_cargos in their companies"
ON public.mapeamento_competencias_cargos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = mapeamento_competencias_cargos.empresa_id
  )
);

CREATE POLICY "Users can update mapeamento_competencias_cargos from their companies"
ON public.mapeamento_competencias_cargos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = mapeamento_competencias_cargos.empresa_id
  )
);

CREATE POLICY "Users can delete mapeamento_competencias_cargos from their companies"
ON public.mapeamento_competencias_cargos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = mapeamento_competencias_cargos.empresa_id
  )
);

-- Create policies for avaliacoes_desempenho
CREATE POLICY "Users can view avaliacoes_desempenho from their companies"
ON public.avaliacoes_desempenho FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = avaliacoes_desempenho.empresa_id
  )
);

CREATE POLICY "Users can create avaliacoes_desempenho in their companies"
ON public.avaliacoes_desempenho FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = avaliacoes_desempenho.empresa_id
  )
);

CREATE POLICY "Users can update avaliacoes_desempenho from their companies"
ON public.avaliacoes_desempenho FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = avaliacoes_desempenho.empresa_id
  )
);

CREATE POLICY "Users can delete avaliacoes_desempenho from their companies"
ON public.avaliacoes_desempenho FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = avaliacoes_desempenho.empresa_id
  )
);

-- Create policies for competencias_avaliadas
CREATE POLICY "Users can view competencias_avaliadas from their companies"
ON public.competencias_avaliadas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM avaliacoes_desempenho ad
    JOIN usuarios_empresas ue ON ue.empresa_id = ad.empresa_id
    WHERE ue.user_id = auth.uid() AND ad.id = competencias_avaliadas.avaliacao_id
  )
);

CREATE POLICY "Users can create competencias_avaliadas in their companies"
ON public.competencias_avaliadas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM avaliacoes_desempenho ad
    JOIN usuarios_empresas ue ON ue.empresa_id = ad.empresa_id
    WHERE ue.user_id = auth.uid() AND ad.id = competencias_avaliadas.avaliacao_id
  )
);

CREATE POLICY "Users can update competencias_avaliadas from their companies"
ON public.competencias_avaliadas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM avaliacoes_desempenho ad
    JOIN usuarios_empresas ue ON ue.empresa_id = ad.empresa_id
    WHERE ue.user_id = auth.uid() AND ad.id = competencias_avaliadas.avaliacao_id
  )
);

CREATE POLICY "Users can delete competencias_avaliadas from their companies"
ON public.competencias_avaliadas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM avaliacoes_desempenho ad
    JOIN usuarios_empresas ue ON ue.empresa_id = ad.empresa_id
    WHERE ue.user_id = auth.uid() AND ad.id = competencias_avaliadas.avaliacao_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_competencias_updated_at
BEFORE UPDATE ON public.competencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_niveis_importancia_updated_at
BEFORE UPDATE ON public.niveis_importancia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mapeamento_competencias_cargos_updated_at
BEFORE UPDATE ON public.mapeamento_competencias_cargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avaliacoes_desempenho_updated_at
BEFORE UPDATE ON public.avaliacoes_desempenho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competencias_avaliadas_updated_at
BEFORE UPDATE ON public.competencias_avaliadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();