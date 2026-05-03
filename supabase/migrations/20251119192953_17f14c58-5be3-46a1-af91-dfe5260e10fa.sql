-- Fix infinite recursion in RLS policy for empresas INSERT
-- by removing self-reference to empresas table

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Admins can create empresas in their group" ON public.empresas;

-- Create safer policy: any admin of any empresa can create new empresas
CREATE POLICY "Admins can create empresas"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.usuarios_empresas ue ON ue.empresa_id = ur.empresa_id
    WHERE ur.user_id = auth.uid()
      AND ue.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);
