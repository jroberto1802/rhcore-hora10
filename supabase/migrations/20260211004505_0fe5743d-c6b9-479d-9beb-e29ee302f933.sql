
-- Permitir que usuarios vejam profiles de pessoas no mesmo grupo empresarial
CREATE POLICY "Users can view profiles in same business group"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM usuarios_empresas ue1
    JOIN empresas e1 ON e1.id = ue1.empresa_id
    JOIN usuarios_empresas ue2 ON ue2.user_id = profiles.user_id
    JOIN empresas e2 ON e2.id = ue2.empresa_id
    WHERE ue1.user_id = auth.uid()
      AND e1.grupo_empresarial_id = e2.grupo_empresarial_id
  )
);
