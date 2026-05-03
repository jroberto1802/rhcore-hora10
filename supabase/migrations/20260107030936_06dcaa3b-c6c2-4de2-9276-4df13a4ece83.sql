-- Adicionar campo recebe_vale_alimentacao na tabela funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS recebe_vale_alimentacao boolean DEFAULT false;

-- Criar tabela de vale alimentação
CREATE TABLE public.vale_alimentacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  numero_cartao TEXT,
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  data_deposito DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT vale_alimentacao_unique UNIQUE (empresa_id, funcionario_id, ano, mes)
);

-- Índices para vale_alimentacao
CREATE INDEX idx_vale_alimentacao_empresa ON public.vale_alimentacao(empresa_id);
CREATE INDEX idx_vale_alimentacao_funcionario ON public.vale_alimentacao(funcionario_id);
CREATE INDEX idx_vale_alimentacao_periodo ON public.vale_alimentacao(ano, mes);

-- Habilitar RLS
ALTER TABLE public.vale_alimentacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vale_alimentacao
CREATE POLICY "Users can view vale_alimentacao of their empresas" 
ON public.vale_alimentacao 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao.empresa_id
  )
);

CREATE POLICY "Users with permission can insert vale_alimentacao" 
ON public.vale_alimentacao 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao.empresa_id
  )
);

CREATE POLICY "Users with permission can update vale_alimentacao" 
ON public.vale_alimentacao 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao.empresa_id
  )
);

CREATE POLICY "Users with permission can delete vale_alimentacao" 
ON public.vale_alimentacao 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao.empresa_id
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vale_alimentacao_updated_at
BEFORE UPDATE ON public.vale_alimentacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para modelo de recibo de vale alimentação
CREATE TABLE public.vale_alimentacao_modelo_recibo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  modelo_texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.vale_alimentacao_modelo_recibo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vale_alimentacao_modelo_recibo
CREATE POLICY "Users can view modelo_recibo of their empresas" 
ON public.vale_alimentacao_modelo_recibo 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao_modelo_recibo.empresa_id
  )
);

CREATE POLICY "Users can insert modelo_recibo" 
ON public.vale_alimentacao_modelo_recibo 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao_modelo_recibo.empresa_id
  )
);

CREATE POLICY "Users can update modelo_recibo" 
ON public.vale_alimentacao_modelo_recibo 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao_modelo_recibo.empresa_id
  )
);

CREATE POLICY "Users can delete modelo_recibo" 
ON public.vale_alimentacao_modelo_recibo 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue 
    WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = vale_alimentacao_modelo_recibo.empresa_id
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vale_alimentacao_modelo_recibo_updated_at
BEFORE UPDATE ON public.vale_alimentacao_modelo_recibo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();