-- Drop the incorrect policy
DROP POLICY IF EXISTS "Admins can create empresas in their group" ON public.empresas;

-- Create corrected policy for inserting empresas
-- Allows admins to create empresas in the same grupo_empresarial
CREATE POLICY "Admins can create empresas in their group"
ON public.empresas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN usuarios_empresas ue ON ue.empresa_id = ur.empresa_id
    JOIN empresas e ON e.id = ue.empresa_id
    WHERE ur.user_id = auth.uid()
    AND ue.user_id = auth.uid()
    AND e.grupo_empresarial_id = empresas.grupo_empresarial_id
    AND ur.role = 'admin'
  )
);