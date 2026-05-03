-- Criar enum para categoria de documentos padrão
CREATE TYPE public.documento_padrao_categoria AS ENUM ('Geral', 'Anual', 'Mensal');

-- Criar enum para tipo de aplicação
CREATE TYPE public.documento_padrao_tipo_aplicacao AS ENUM ('terceirizado', 'colaborador');

-- Criar tabela de documentos padrão
CREATE TABLE public.documentos_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome_documento TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria documento_padrao_categoria NOT NULL,
  tipo_aplicacao documento_padrao_tipo_aplicacao NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documentos_padrao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view documentos_padrao from their companies"
ON public.documentos_padrao
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = documentos_padrao.empresa_id
  )
);

CREATE POLICY "Admins and HR can create documentos_padrao"
ON public.documentos_padrao
FOR INSERT
WITH CHECK (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins and HR can update documentos_padrao"
ON public.documentos_padrao
FOR UPDATE
USING (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins can delete documentos_padrao"
ON public.documentos_padrao
FOR DELETE
USING (has_role(auth.uid(), empresa_id, 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_documentos_padrao_updated_at
BEFORE UPDATE ON public.documentos_padrao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();