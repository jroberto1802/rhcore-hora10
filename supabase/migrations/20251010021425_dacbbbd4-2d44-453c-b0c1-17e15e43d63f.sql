-- Create terceirizados table
CREATE TABLE public.terceirizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT,
  area_atuacao TEXT,
  contato_responsavel_nome TEXT,
  contato_responsavel_telefone TEXT,
  contato_responsavel_email TEXT,
  contato_rh_nome TEXT,
  contato_rh_telefone TEXT,
  contato_rh_email TEXT,
  endereco TEXT,
  numero_endereco TEXT,
  cep TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  contrato_url TEXT,
  logo_url TEXT,
  situacao TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colaboradores_terceirizados table
CREATE TABLE public.colaboradores_terceirizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  terceirizado_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  telefone TEXT,
  email TEXT,
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  endereco TEXT,
  numero_endereco TEXT,
  cep TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cargo TEXT,
  area_atuacao TEXT,
  supervisor_id UUID,
  status TEXT NOT NULL DEFAULT 'ativo',
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terceirizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores_terceirizados ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terceirizados
CREATE POLICY "Users can view terceirizados from their companies"
ON public.terceirizados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = terceirizados.empresa_id
  )
);

CREATE POLICY "Admins and HR can create terceirizados"
ON public.terceirizados
FOR INSERT
TO authenticated
WITH CHECK (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins and HR can update terceirizados"
ON public.terceirizados
FOR UPDATE
TO authenticated
USING (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins can delete terceirizados"
ON public.terceirizados
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), empresa_id, 'admin'));

-- RLS Policies for colaboradores_terceirizados
CREATE POLICY "Users can view colaboradores_terceirizados from their companies"
ON public.colaboradores_terceirizados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = colaboradores_terceirizados.empresa_id
  )
);

CREATE POLICY "Admins and HR can create colaboradores_terceirizados"
ON public.colaboradores_terceirizados
FOR INSERT
TO authenticated
WITH CHECK (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins and HR can update colaboradores_terceirizados"
ON public.colaboradores_terceirizados
FOR UPDATE
TO authenticated
USING (can_view_sensitive_data(auth.uid(), empresa_id));

CREATE POLICY "Admins can delete colaboradores_terceirizados"
ON public.colaboradores_terceirizados
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), empresa_id, 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_terceirizados_updated_at
BEFORE UPDATE ON public.terceirizados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaboradores_terceirizados_updated_at
BEFORE UPDATE ON public.colaboradores_terceirizados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();