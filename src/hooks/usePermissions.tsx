import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePermissionsReturn {
  permissions: Set<string>;
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (codigo: string) => boolean;
  hasAnyPermission: (codigos: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(empresaId: string | undefined): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!empresaId) {
      setPermissions(new Set());
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions(new Set());
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      // Verificar se é Super Admin (role 'admin' na tabela user_roles)
      // Usar queries separadas para evitar dependência de FK
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      // Buscar o grupo empresarial da empresa atual
      const { data: currentEmpresa } = await supabase
        .from('empresas')
        .select('grupo_empresarial_id')
        .eq('id', empresaId)
        .single();

      // Verificar se alguma das empresas onde o usuário é admin pertence ao mesmo grupo
      let isAdmin = false;
      if (adminRoles && adminRoles.length > 0 && currentEmpresa) {
        const empresaIds = adminRoles.map(r => r.empresa_id);
        const { data: empresasAdmin } = await supabase
          .from('empresas')
          .select('grupo_empresarial_id')
          .in('id', empresaIds);

        isAdmin = empresasAdmin?.some(
          e => e.grupo_empresarial_id === currentEmpresa.grupo_empresarial_id
        ) ?? false;
      }

      setIsSuperAdmin(isAdmin);

      if (isAdmin) {
        // Super Admin tem todas as permissões
        setPermissions(new Set(['*']));
        setIsLoading(false);
        return;
      }

      // Buscar permissões dos perfis do usuário
      const { data: userPerfis } = await supabase
        .from('usuarios_perfis')
        .select(`
          perfil_id,
          perfil:perfis_acesso!inner(
            empresa:empresas!inner(grupo_empresarial_id)
          )
        `)
        .eq('user_id', user.id);

      if (!userPerfis || userPerfis.length === 0) {
        setPermissions(new Set());
        setIsLoading(false);
        return;
      }

      // Filtrar perfis do mesmo grupo empresarial
      const perfilIds = userPerfis
        .filter((up: any) => up.perfil?.empresa?.grupo_empresarial_id === currentEmpresa?.grupo_empresarial_id)
        .map((up: any) => up.perfil_id);

      if (perfilIds.length === 0) {
        setPermissions(new Set());
        setIsLoading(false);
        return;
      }

      // Buscar permissões
      const { data: permissoesData } = await supabase
        .from('permissoes_perfil')
        .select('codigo_permissao')
        .in('perfil_id', perfilIds);

      const permSet = new Set(permissoesData?.map(p => p.codigo_permissao) ?? []);
      setPermissions(permSet);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(new Set());
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((codigo: string): boolean => {
    if (isSuperAdmin || permissions.has('*')) return true;
    return permissions.has(codigo);
  }, [permissions, isSuperAdmin]);

  const hasAnyPermission = useCallback((codigos: string[]): boolean => {
    if (isSuperAdmin || permissions.has('*')) return true;
    return codigos.some(codigo => permissions.has(codigo));
  }, [permissions, isSuperAdmin]);

  return {
    permissions,
    isSuperAdmin,
    isLoading,
    hasPermission,
    hasAnyPermission,
    refreshPermissions: fetchPermissions,
  };
}
