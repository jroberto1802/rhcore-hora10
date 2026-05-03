-- Atualizar a função can_view_sensitive_data mantendo a mesma assinatura
-- A função existente tem parâmetros: (_user_id uuid, _empresa_id uuid)
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Verificar se é admin/hr_manager no sistema de roles (compatibilidade)
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN empresas e_role ON e_role.id = ur.empresa_id
      JOIN empresas e_target ON e_target.id = _empresa_id
      WHERE ur.user_id = _user_id
        AND ur.role IN ('admin', 'hr_manager')
        AND e_role.grupo_empresarial_id = e_target.grupo_empresarial_id
    )
    OR
    -- Verificar nova permissão func.dados_sensiveis no sistema de perfis
    EXISTS (
      SELECT 1 FROM usuarios_perfis up
      JOIN perfis_acesso pa ON pa.id = up.perfil_id
      JOIN permissoes_perfil pp ON pp.perfil_id = up.perfil_id
      JOIN empresas e_perfil ON e_perfil.id = pa.empresa_id
      JOIN empresas e_target ON e_target.id = _empresa_id
      WHERE up.user_id = _user_id
        AND pp.codigo_permissao = 'func.dados_sensiveis'
        AND e_perfil.grupo_empresarial_id = e_target.grupo_empresarial_id
    );
$$;