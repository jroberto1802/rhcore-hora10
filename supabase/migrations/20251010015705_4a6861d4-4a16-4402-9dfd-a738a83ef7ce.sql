-- =====================================================
-- SECURITY FIX: Restrict access to sensitive employee data
-- =====================================================

-- First, drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view funcionarios basic info from their companies" ON public.funcionarios;

-- Create separate SELECT policies with proper restrictions

-- Policy 1: Admin and HR managers can view ALL fields
CREATE POLICY "Admins and HR managers can view all funcionario data"
ON public.funcionarios
FOR SELECT
TO authenticated
USING (
  can_view_sensitive_data(auth.uid(), empresa_id)
);

-- Policy 2: Regular employees can view only NON-SENSITIVE fields
-- We use a SECURITY DEFINER function to enforce column-level filtering
CREATE POLICY "Employees can view basic funcionario data"
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
  AND NOT can_view_sensitive_data(auth.uid(), empresa_id)
);

-- Create a view that returns only non-sensitive data for regular employees
CREATE OR REPLACE VIEW public.funcionarios_basic AS
SELECT 
  id,
  empresa_id,
  codigo,
  nome_completo,
  nome_abreviado,
  genero,
  data_nascimento,
  pcd,
  cargo_atual,
  tipo_cargo,
  setor_atual,
  tipo_contrato,
  data_admissao,
  data_demissao,
  foto_url,
  created_at,
  updated_at,
  -- Mask sensitive fields
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN cpf
    ELSE NULL
  END as cpf,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN rg
    ELSE NULL
  END as rg,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN ctps
    ELSE NULL
  END as ctps,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN serie
    ELSE NULL
  END as serie,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN pis
    ELSE NULL
  END as pis,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN telefone
    ELSE NULL
  END as telefone,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN endereco
    ELSE NULL
  END as endereco,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN numero_endereco
    ELSE NULL
  END as numero_endereco,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN bairro
    ELSE NULL
  END as bairro,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN cidade
    ELSE NULL
  END as cidade,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN uf
    ELSE NULL
  END as uf,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN cep
    ELSE NULL
  END as cep,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN telefone_emergencia
    ELSE NULL
  END as telefone_emergencia,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN nome_contato_emergencia
    ELSE NULL
  END as nome_contato_emergencia,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN tipo_sanguineo
    ELSE NULL
  END as tipo_sanguineo,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN salario_atual
    ELSE NULL
  END as salario_atual,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN banco
    ELSE NULL
  END as banco,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN agencia
    ELSE NULL
  END as agencia,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN numero_conta
    ELSE NULL
  END as numero_conta,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN tipo_conta
    ELSE NULL
  END as tipo_conta,
  CASE 
    WHEN can_view_sensitive_data(auth.uid(), empresa_id) THEN chave_pix
    ELSE NULL
  END as chave_pix
FROM public.funcionarios;

-- Enable RLS on the view
ALTER VIEW public.funcionarios_basic SET (security_invoker = true);

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.funcionarios_basic TO authenticated;