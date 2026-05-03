-- Políticas para permitir usuários atualizarem empresas de suas organizações
CREATE POLICY "Users can update empresas in their companies"
ON public.empresas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = empresas.id
  )
);

-- Políticas para permitir usuários atualizarem grupos empresariais
CREATE POLICY "Users can update grupos_empresariais of their companies"
ON public.grupos_empresariais
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = auth.uid()
    AND e.grupo_empresarial_id = grupos_empresariais.id
  )
);