-- Adicionar coluna user_id na tabela funcionarios para vincular ao usuário do sistema
ALTER TABLE public.funcionarios 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_user_id ON public.funcionarios(user_id);

-- Comentário explicativo
COMMENT ON COLUMN public.funcionarios.user_id IS 
  'Vínculo com o usuário do sistema para acesso ao RHCore';

-- Corrigir função update_roteiros_entrevista_updated_at adicionando search_path
CREATE OR REPLACE FUNCTION public.update_roteiros_entrevista_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Atualizar função can_view_sensitive_data para verificar grupo empresarial
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.empresas e_role ON e_role.id = ur.empresa_id
    JOIN public.empresas e_target ON e_target.id = _empresa_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'hr_manager')
      AND e_role.grupo_empresarial_id = e_target.grupo_empresarial_id
  );
$$;

-- Atualizar função has_role para incluir search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _empresa_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
      AND role = _role
  )
$$;

-- Policy para admins poderem ver profiles de usuários de suas empresas
DROP POLICY IF EXISTS "Admins can view profiles in their companies" ON public.profiles;
CREATE POLICY "Admins can view profiles in their companies"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 
    FROM public.user_roles ur_admin
    JOIN public.usuarios_empresas ue ON ue.empresa_id = ur_admin.empresa_id
    WHERE ur_admin.user_id = auth.uid()
      AND ur_admin.role IN ('admin', 'hr_manager')
      AND ue.user_id = profiles.user_id
  )
);