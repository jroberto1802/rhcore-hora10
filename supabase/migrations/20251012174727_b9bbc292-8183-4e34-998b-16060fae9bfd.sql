-- Criar tabela para documentos de terceirizados
CREATE TABLE public.documentos_terceirizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  terceirizado_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  nome_documento TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Mensal', 'Anual', 'Indeterminado', 'Outros')),
  data_vigencia_inicio DATE,
  data_vigencia_fim DATE,
  documento_url TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para documentos de colaboradores terceirizados
CREATE TABLE public.documentos_colaboradores_terceirizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  nome_documento TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Mensal', 'Anual', 'Indeterminado', 'Outros')),
  data_vigencia_inicio DATE,
  data_vigencia_fim DATE,
  documento_url TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.documentos_terceirizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_colaboradores_terceirizados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos_terceirizados
CREATE POLICY "Users can view documentos_terceirizados from their companies"
ON public.documentos_terceirizados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can create documentos_terceirizados in their companies"
ON public.documentos_terceirizados
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can update documentos_terceirizados from their companies"
ON public.documentos_terceirizados
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can delete documentos_terceirizados from their companies"
ON public.documentos_terceirizados
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_terceirizados.empresa_id
  )
);

-- Políticas RLS para documentos_colaboradores_terceirizados
CREATE POLICY "Users can view documentos_colaboradores_terceirizados from their companies"
ON public.documentos_colaboradores_terceirizados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_colaboradores_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can create documentos_colaboradores_terceirizados in their companies"
ON public.documentos_colaboradores_terceirizados
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_colaboradores_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can update documentos_colaboradores_terceirizados from their companies"
ON public.documentos_colaboradores_terceirizados
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_colaboradores_terceirizados.empresa_id
  )
);

CREATE POLICY "Users can delete documentos_colaboradores_terceirizados from their companies"
ON public.documentos_colaboradores_terceirizados
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = documentos_colaboradores_terceirizados.empresa_id
  )
);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_documentos_terceirizados_updated_at
BEFORE UPDATE ON public.documentos_terceirizados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_colaboradores_terceirizados_updated_at
BEFORE UPDATE ON public.documentos_colaboradores_terceirizados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();