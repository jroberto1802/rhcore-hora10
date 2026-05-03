-- =====================================================
-- SECURITY FIX: Secure funcionarios_safe view access
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS funcionarios_safe;

-- Recreate as a table-valued function with built-in security
-- This approach allows us to enforce security at the function level
CREATE OR REPLACE FUNCTION funcionarios_safe()
RETURNS TABLE (
  id uuid,
  empresa_id uuid,
  codigo text,
  nome_completo text,
  nome_abreviado text,
  cargo_atual text,
  tipo_cargo text,
  setor_atual text,
  tipo_contrato text,
  data_admissao date,
  data_demissao date,
  foto_url text,
  pcd boolean,
  created_at timestamptz,
  updated_at timestamptz,
  cpf text,
  rg text,
  ctps text,
  pis text,
  serie text,
  telefone text,
  email text,
  endereco text,
  numero_endereco text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  salario_atual numeric,
  banco text,
  agencia text,
  numero_conta text,
  tipo_conta text,
  chave_pix text,
  telefone_emergencia text,
  nome_contato_emergencia text,
  tipo_sanguineo text,
  genero text,
  data_nascimento date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id, 
    f.empresa_id, 
    f.codigo, 
    f.nome_completo, 
    f.nome_abreviado,
    f.cargo_atual, 
    f.tipo_cargo, 
    f.setor_atual, 
    f.tipo_contrato,
    f.data_admissao, 
    f.data_demissao, 
    f.foto_url, 
    f.pcd,
    f.created_at, 
    f.updated_at,
    
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
  FROM funcionarios f
  WHERE EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() 
      AND ue.empresa_id = f.empresa_id
  );
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION funcionarios_safe() TO authenticated;
REVOKE EXECUTE ON FUNCTION funcionarios_safe() FROM anon, public;