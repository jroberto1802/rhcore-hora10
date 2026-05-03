import { usePermissions } from './usePermissions';

export type UserRole = 'admin' | 'hr_manager' | 'employee';

interface UserRoleData {
  role: UserRole | null;
  canViewSensitiveData: boolean;
  isLoading: boolean;
}

export function useUserRole(empresaId: string | undefined): UserRoleData {
  const { hasPermission, isSuperAdmin, isLoading } = usePermissions(empresaId);

  // Determina a role com base no sistema antigo para compatibilidade
  const role: UserRole | null = isSuperAdmin ? 'admin' : null;

  // Dados sensíveis agora são controlados pela permissão func.dados_sensiveis
  // Super admins (admin/hr_manager no user_roles) sempre têm acesso
  // Outros usuários precisam da permissão func.dados_sensiveis
  const canViewSensitiveData = isSuperAdmin || hasPermission('func.dados_sensiveis');

  return {
    role,
    canViewSensitiveData,
    isLoading,
  };
}

// Helper function to mask sensitive data
export function maskSensitiveField(value: string | null | undefined, canView: boolean): string {
  if (canView || !value) return value || '';
  
  // Mask the data but show partial info
  if (value.length <= 4) return '***';
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
}
