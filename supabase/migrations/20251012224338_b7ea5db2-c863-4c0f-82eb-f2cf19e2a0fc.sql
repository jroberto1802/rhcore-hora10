-- Drop the existing SELECT policy that allows all users to view funcionarios
DROP POLICY IF EXISTS "Users can view funcionarios from their companies" ON public.funcionarios;

-- Create new SELECT policy that restricts direct access to the funcionarios table
-- Only admins and HR managers can SELECT directly from funcionarios table
CREATE POLICY "Only admins and HR can view full funcionarios data"
ON public.funcionarios
FOR SELECT
USING (can_view_sensitive_data(auth.uid(), empresa_id));

-- Create a view for employees to see limited funcionarios data (non-sensitive fields only)
CREATE OR REPLACE VIEW public.funcionarios_limited AS
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
  -- Sensitive fields are NULL for regular employees
  NULL::text as cpf,
  NULL::text as rg,
  NULL::text as ctps,
  NULL::text as pis,
  NULL::text as serie,
  NULL::text as telefone,
  NULL::text as email,
  NULL::text as endereco,
  NULL::text as numero_endereco,
  NULL::text as bairro,
  NULL::text as cidade,
  NULL::text as uf,
  NULL::text as cep,
  NULL::numeric as salario_atual,
  NULL::text as banco,
  NULL::text as agencia,
  NULL::text as numero_conta,
  NULL::text as tipo_conta,
  NULL::text as chave_pix,
  NULL::text as telefone_emergencia,
  NULL::text as nome_contato_emergencia,
  NULL::text as tipo_sanguineo,
  NULL::text as genero,
  NULL::date as data_nascimento
FROM funcionarios f
WHERE EXISTS (
  SELECT 1
  FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() 
    AND ue.empresa_id = f.empresa_id
);

-- Grant SELECT permission on the limited view to authenticated users
GRANT SELECT ON public.funcionarios_limited TO authenticated;

-- Update the funcionarios_safe() function to use proper role checks
CREATE OR REPLACE FUNCTION public.funcionarios_safe()
RETURNS TABLE(
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
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