-- =====================================================
-- SECURITY FIX: Column-level protection for sensitive employee data
-- =====================================================

-- Create a secure view that masks sensitive fields based on user role
CREATE OR REPLACE VIEW funcionarios_safe AS
SELECT 
  f.id, f.empresa_id, f.codigo, f.nome_completo, f.nome_abreviado,
  f.cargo_atual, f.tipo_cargo, f.setor_atual, f.tipo_contrato,
  f.data_admissao, f.data_demissao, f.foto_url, f.pcd,
  f.created_at, f.updated_at,
  
  -- Conditional sensitive fields based on role (HR/Admin only)
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.cpf ELSE NULL END as cpf,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.rg ELSE NULL END as rg,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.ctps ELSE NULL END as ctps,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.pis ELSE NULL END as pis,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.serie ELSE NULL END as serie,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.telefone ELSE NULL END as telefone,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.email ELSE NULL END as email,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.endereco ELSE NULL END as endereco,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.numero_endereco ELSE NULL END as numero_endereco,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.bairro ELSE NULL END as bairro,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.cidade ELSE NULL END as cidade,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.uf ELSE NULL END as uf,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.cep ELSE NULL END as cep,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.salario_atual ELSE NULL END as salario_atual,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.banco ELSE NULL END as banco,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.agencia ELSE NULL END as agencia,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.numero_conta ELSE NULL END as numero_conta,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.tipo_conta ELSE NULL END as tipo_conta,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.chave_pix ELSE NULL END as chave_pix,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.telefone_emergencia ELSE NULL END as telefone_emergencia,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.nome_contato_emergencia ELSE NULL END as nome_contato_emergencia,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.tipo_sanguineo ELSE NULL END as tipo_sanguineo,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.genero ELSE NULL END as genero,
  CASE WHEN can_view_sensitive_data(auth.uid(), f.empresa_id) 
    THEN f.data_nascimento ELSE NULL END as data_nascimento
FROM funcionarios f;

-- Enable security invoker mode (view uses caller's permissions)
ALTER VIEW funcionarios_safe SET (security_invoker = true);

-- Grant SELECT to authenticated users
GRANT SELECT ON funcionarios_safe TO authenticated;

-- =====================================================
-- SECURITY FIX: Restrict ocorrencias visibility
-- =====================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view ocorrencias from their companies" ON ocorrencias;

-- Create restrictive policy - only HR/Admin and incident reporter can view
CREATE POLICY "Restricted ocorrencias visibility"
ON ocorrencias FOR SELECT
TO authenticated
USING (
  -- HR/Admin can see all company incidents
  can_view_sensitive_data(auth.uid(), empresa_id)
  OR
  -- User is the reporter
  usuario_responsavel_id = auth.uid()
);