-- Adicionar coluna ativo na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- Criar índice para melhorar performance de queries filtradas por ativo
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON empresas(ativo);

-- Atualizar RLS policies para empresas

-- Permitir que admins criem novas empresas em seu grupo empresarial
CREATE POLICY "Admins can create empresas in their group"
ON empresas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN empresas e ON e.grupo_empresarial_id = empresas.grupo_empresarial_id
    JOIN usuarios_empresas ue ON ue.empresa_id = e.id
    WHERE ur.user_id = auth.uid()
    AND ue.user_id = auth.uid()
    AND ur.empresa_id = e.id
    AND ur.role = 'admin'::app_role
  )
);