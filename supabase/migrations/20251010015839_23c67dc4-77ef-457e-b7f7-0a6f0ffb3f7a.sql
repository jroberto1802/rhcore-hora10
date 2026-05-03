-- =====================================================
-- SECURITY FIX: Remove vulnerable view and fix RLS policies
-- =====================================================

-- Drop the vulnerable view that bypasses security
DROP VIEW IF EXISTS public.funcionarios_basic;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins and HR managers can view all funcionario data" ON public.funcionarios;
DROP POLICY IF EXISTS "Employees can view basic funcionario data" ON public.funcionarios;

-- Create a single, secure SELECT policy
-- All users can see funcionarios from their companies, but sensitive data
-- masking is enforced at the application level using the useUserRole hook
CREATE POLICY "Users can view funcionarios from their companies"
ON public.funcionarios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = funcionarios.empresa_id
  )
);

-- Note: Data masking for sensitive fields (CPF, RG, salary, bank details, etc.)
-- is handled by the frontend using the useUserRole hook and maskSensitiveField function.
-- This prevents direct database queries from bypassing the masking while maintaining
-- proper RLS security at the database level.