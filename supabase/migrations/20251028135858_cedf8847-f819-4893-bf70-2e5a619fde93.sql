-- Criar tabela de candidatos
CREATE TABLE public.candidatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  contato_whatsapp TEXT,
  curriculo_url TEXT,
  cep TEXT,
  logradouro TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  complemento TEXT,
  formacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de processos seletivos
CREATE TABLE public.processos_seletivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome_processo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  turno_vaga TEXT NOT NULL,
  quantidade_vagas INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_final DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de entrevistas
CREATE TABLE public.entrevistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_seletivo_id UUID NOT NULL,
  candidato_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  data_entrevista DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aguardando',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos_seletivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrevistas ENABLE ROW LEVEL SECURITY;

-- Políticas para candidatos
CREATE POLICY "Users can view candidatos from their companies" 
ON public.candidatos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = candidatos.empresa_id
));

CREATE POLICY "Users can create candidatos in their companies" 
ON public.candidatos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = candidatos.empresa_id
));

CREATE POLICY "Users can update candidatos from their companies" 
ON public.candidatos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = candidatos.empresa_id
));

CREATE POLICY "Users can delete candidatos from their companies" 
ON public.candidatos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = candidatos.empresa_id
));

-- Políticas para processos_seletivos
CREATE POLICY "Users can view processos_seletivos from their companies" 
ON public.processos_seletivos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = processos_seletivos.empresa_id
));

CREATE POLICY "Users can create processos_seletivos in their companies" 
ON public.processos_seletivos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = processos_seletivos.empresa_id
));

CREATE POLICY "Users can update processos_seletivos from their companies" 
ON public.processos_seletivos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = processos_seletivos.empresa_id
));

CREATE POLICY "Users can delete processos_seletivos from their companies" 
ON public.processos_seletivos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = processos_seletivos.empresa_id
));

-- Políticas para entrevistas
CREATE POLICY "Users can view entrevistas from their companies" 
ON public.entrevistas 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = entrevistas.empresa_id
));

CREATE POLICY "Users can create entrevistas in their companies" 
ON public.entrevistas 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = entrevistas.empresa_id
));

CREATE POLICY "Users can update entrevistas from their companies" 
ON public.entrevistas 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = entrevistas.empresa_id
));

CREATE POLICY "Users can delete entrevistas from their companies" 
ON public.entrevistas 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = entrevistas.empresa_id
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_candidatos_updated_at
BEFORE UPDATE ON public.candidatos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processos_seletivos_updated_at
BEFORE UPDATE ON public.processos_seletivos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entrevistas_updated_at
BEFORE UPDATE ON public.entrevistas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();