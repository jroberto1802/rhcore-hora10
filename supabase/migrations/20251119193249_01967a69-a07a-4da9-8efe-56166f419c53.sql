-- Add RLS policy to allow admins to create user-empresa relationships
-- This allows admins to link users to empresas in their grupo_empresarial

CREATE POLICY "Admins can create user-empresa relationships"
ON public.usuarios_empresas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.usuarios_empresas ue ON ue.empresa_id = ur.empresa_id
    JOIN public.empresas e1 ON e1.id = ue.empresa_id
    JOIN public.empresas e2 ON e2.id = usuarios_empresas.empresa_id
    WHERE ur.user_id = auth.uid()
      AND ue.user_id = auth.uid()
      AND ur.role = 'admin'
      AND e1.grupo_empresarial_id = e2.grupo_empresarial_id
  )
);