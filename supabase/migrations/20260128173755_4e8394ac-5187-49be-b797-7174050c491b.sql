
-- Criar tabela de ASOs (Atestados de Saúde Ocupacional)
CREATE TABLE public.asos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo_aso TEXT NOT NULL, -- Admissional, Periódico, Demissional, etc.
  data_emissao DATE NOT NULL,
  data_validade DATE,
  medico_responsavel TEXT,
  crm_medico TEXT,
  clinica TEXT,
  resultado TEXT, -- Apto, Inapto, Apto com Restrições
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de exames vinculados ao ASO
CREATE TABLE public.exames_aso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aso_id UUID NOT NULL REFERENCES public.asos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_exame TEXT NOT NULL,
  data_realizacao DATE NOT NULL,
  data_validade DATE,
  resultado TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de treinamentos do funcionário
CREATE TABLE public.treinamentos_funcionario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_treinamento TEXT NOT NULL,
  norma TEXT,
  data_realizacao DATE NOT NULL,
  data_validade DATE,
  carga_horaria INTEGER,
  instrutor TEXT,
  certificado_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.asos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames_aso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos_funcionario ENABLE ROW LEVEL SECURITY;

-- Políticas para ASOs
CREATE POLICY "Users can view asos from their companies" 
ON public.asos FOR SELECT 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = asos.empresa_id));

CREATE POLICY "Users can create asos in their companies" 
ON public.asos FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = asos.empresa_id));

CREATE POLICY "Users can update asos from their companies" 
ON public.asos FOR UPDATE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = asos.empresa_id));

CREATE POLICY "Users can delete asos from their companies" 
ON public.asos FOR DELETE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = asos.empresa_id));

-- Políticas para exames_aso
CREATE POLICY "Users can view exames_aso from their companies" 
ON public.exames_aso FOR SELECT 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_aso.empresa_id));

CREATE POLICY "Users can create exames_aso in their companies" 
ON public.exames_aso FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_aso.empresa_id));

CREATE POLICY "Users can update exames_aso from their companies" 
ON public.exames_aso FOR UPDATE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_aso.empresa_id));

CREATE POLICY "Users can delete exames_aso from their companies" 
ON public.exames_aso FOR DELETE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_aso.empresa_id));

-- Políticas para treinamentos_funcionario
CREATE POLICY "Users can view treinamentos_funcionario from their companies" 
ON public.treinamentos_funcionario FOR SELECT 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_funcionario.empresa_id));

CREATE POLICY "Users can create treinamentos_funcionario in their companies" 
ON public.treinamentos_funcionario FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_funcionario.empresa_id));

CREATE POLICY "Users can update treinamentos_funcionario from their companies" 
ON public.treinamentos_funcionario FOR UPDATE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_funcionario.empresa_id));

CREATE POLICY "Users can delete treinamentos_funcionario from their companies" 
ON public.treinamentos_funcionario FOR DELETE 
USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_funcionario.empresa_id));

-- Índices para performance
CREATE INDEX idx_asos_funcionario ON public.asos(funcionario_id);
CREATE INDEX idx_asos_empresa ON public.asos(empresa_id);
CREATE INDEX idx_exames_aso_aso ON public.exames_aso(aso_id);
CREATE INDEX idx_treinamentos_funcionario_func ON public.treinamentos_funcionario(funcionario_id);
CREATE INDEX idx_treinamentos_funcionario_empresa ON public.treinamentos_funcionario(empresa_id);
