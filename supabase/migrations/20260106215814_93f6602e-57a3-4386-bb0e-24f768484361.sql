-- Tabela de Perfis de Acesso
CREATE TABLE public.perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, nome)
);

-- Tabela de Permissões do Perfil
CREATE TABLE public.permissoes_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis_acesso(id) ON DELETE CASCADE,
  codigo_permissao text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(perfil_id, codigo_permissao)
);

-- Tabela de Vínculo Usuário-Perfil
CREATE TABLE public.usuarios_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  perfil_id uuid NOT NULL REFERENCES public.perfis_acesso(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, perfil_id)
);

-- Habilitar RLS
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_perfis ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_perfis_acesso_updated_at
  BEFORE UPDATE ON public.perfis_acesso
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _empresa_id uuid, _codigo_permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super Admin (role 'admin') ignora todas as permissões
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.empresas e_role ON e_role.id = ur.empresa_id
      JOIN public.empresas e_target ON e_target.id = _empresa_id
      WHERE ur.user_id = _user_id 
        AND ur.role = 'admin'
        AND e_role.grupo_empresarial_id = e_target.grupo_empresarial_id
    ) THEN true
    ELSE EXISTS (
      SELECT 1 
      FROM public.usuarios_perfis up
      JOIN public.perfis_acesso pa ON pa.id = up.perfil_id
      JOIN public.permissoes_perfil pp ON pp.perfil_id = pa.id
      JOIN public.empresas e_perfil ON e_perfil.id = pa.empresa_id
      JOIN public.empresas e_target ON e_target.id = _empresa_id
      WHERE up.user_id = _user_id 
        AND pp.codigo_permissao = _codigo_permissao
        AND e_perfil.grupo_empresarial_id = e_target.grupo_empresarial_id
    )
  END;
$$;

-- Função para obter todas as permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid, _empresa_id uuid)
RETURNS TABLE(codigo_permissao text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pp.codigo_permissao
  FROM public.usuarios_perfis up
  JOIN public.perfis_acesso pa ON pa.id = up.perfil_id
  JOIN public.permissoes_perfil pp ON pp.perfil_id = pa.id
  JOIN public.empresas e_perfil ON e_perfil.id = pa.empresa_id
  JOIN public.empresas e_target ON e_target.id = _empresa_id
  WHERE up.user_id = _user_id 
    AND e_perfil.grupo_empresarial_id = e_target.grupo_empresarial_id;
$$;

-- Função para verificar se usuário é Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.empresas e_role ON e_role.id = ur.empresa_id
    JOIN public.empresas e_target ON e_target.id = _empresa_id
    WHERE ur.user_id = _user_id 
      AND ur.role = 'admin'
      AND e_role.grupo_empresarial_id = e_target.grupo_empresarial_id
  );
$$;

-- RLS Policies para perfis_acesso
CREATE POLICY "Users can view perfis from their companies"
ON public.perfis_acesso FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  JOIN empresas e1 ON e1.id = ue.empresa_id
  JOIN empresas e2 ON e2.id = perfis_acesso.empresa_id
  WHERE ue.user_id = auth.uid() 
    AND e1.grupo_empresarial_id = e2.grupo_empresarial_id
));

CREATE POLICY "Users with permission can create perfis"
ON public.perfis_acesso FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid(), empresa_id) 
  OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
);

CREATE POLICY "Users with permission can update perfis"
ON public.perfis_acesso FOR UPDATE
USING (
  NOT is_system AND (
    is_super_admin(auth.uid(), empresa_id) 
    OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
  )
);

CREATE POLICY "Users with permission can delete perfis"
ON public.perfis_acesso FOR DELETE
USING (
  NOT is_system AND (
    is_super_admin(auth.uid(), empresa_id) 
    OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
  )
);

-- RLS Policies para permissoes_perfil
CREATE POLICY "Users can view permissoes from their perfis"
ON public.permissoes_perfil FOR SELECT
USING (EXISTS (
  SELECT 1 FROM perfis_acesso pa
  JOIN usuarios_empresas ue ON true
  JOIN empresas e1 ON e1.id = ue.empresa_id
  JOIN empresas e2 ON e2.id = pa.empresa_id
  WHERE pa.id = permissoes_perfil.perfil_id
    AND ue.user_id = auth.uid()
    AND e1.grupo_empresarial_id = e2.grupo_empresarial_id
));

CREATE POLICY "Users with permission can manage permissoes"
ON public.permissoes_perfil FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM perfis_acesso pa
  WHERE pa.id = permissoes_perfil.perfil_id
    AND NOT pa.is_system
    AND (is_super_admin(auth.uid(), pa.empresa_id) OR has_permission(auth.uid(), pa.empresa_id, 'menu.permissoes'))
));

CREATE POLICY "Users with permission can update permissoes"
ON public.permissoes_perfil FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM perfis_acesso pa
  WHERE pa.id = permissoes_perfil.perfil_id
    AND NOT pa.is_system
    AND (is_super_admin(auth.uid(), pa.empresa_id) OR has_permission(auth.uid(), pa.empresa_id, 'menu.permissoes'))
));

CREATE POLICY "Users with permission can delete permissoes"
ON public.permissoes_perfil FOR DELETE
USING (EXISTS (
  SELECT 1 FROM perfis_acesso pa
  WHERE pa.id = permissoes_perfil.perfil_id
    AND NOT pa.is_system
    AND (is_super_admin(auth.uid(), pa.empresa_id) OR has_permission(auth.uid(), pa.empresa_id, 'menu.permissoes'))
));

-- RLS Policies para usuarios_perfis
CREATE POLICY "Users can view their own perfis assignments"
ON public.usuarios_perfis FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_super_admin(auth.uid(), empresa_id) 
  OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
);

CREATE POLICY "Users with permission can assign perfis"
ON public.usuarios_perfis FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid(), empresa_id) 
  OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
);

CREATE POLICY "Users with permission can remove perfis assignments"
ON public.usuarios_perfis FOR DELETE
USING (
  is_super_admin(auth.uid(), empresa_id) 
  OR has_permission(auth.uid(), empresa_id, 'menu.permissoes')
);