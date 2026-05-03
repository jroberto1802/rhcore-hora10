-- Dropar e recriar a função funcionarios_safe com os novos campos
DROP FUNCTION IF EXISTS public.funcionarios_safe();

CREATE FUNCTION public.funcionarios_safe()
 RETURNS TABLE(id uuid, empresa_id uuid, codigo text, nome_completo text, nome_abreviado text, cargo_atual text, tipo_cargo text, setor_atual text, tipo_contrato text, data_admissao text, data_demissao text, foto_url text, pcd boolean, area_atuacao text, recebe_vale_transporte boolean, recebe_vale_alimentacao boolean, created_at timestamp with time zone, updated_at timestamp with time zone, cpf text, rg text, ctps text, pis text, serie text, telefone text, email text, endereco text, numero_endereco text, bairro text, cidade text, uf text, cep text, salario_atual numeric, banco text, agencia text, numero_conta text, tipo_conta text, chave_pix text, telefone_emergencia text, nome_contato_emergencia text, tipo_sanguineo text, genero text, data_nascimento text, fardamento text, email_corporativo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    f.area_atuacao,
    f.recebe_vale_transporte,
    f.recebe_vale_alimentacao,
    f.created_at, 
    f.updated_at,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.cpf ELSE NULL END as cpf,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.rg ELSE NULL END as rg,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.ctps ELSE NULL END as ctps,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.pis ELSE NULL END as pis,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.serie ELSE NULL END as serie,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.telefone ELSE NULL END as telefone,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.email ELSE NULL END as email,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.endereco ELSE NULL END as endereco,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.numero_endereco ELSE NULL END as numero_endereco,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.bairro ELSE NULL END as bairro,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.cidade ELSE NULL END as cidade,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.uf ELSE NULL END as uf,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.cep ELSE NULL END as cep,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.salario_atual ELSE NULL END as salario_atual,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.banco ELSE NULL END as banco,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.agencia ELSE NULL END as agencia,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.numero_conta ELSE NULL END as numero_conta,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.tipo_conta ELSE NULL END as tipo_conta,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.chave_pix ELSE NULL END as chave_pix,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.telefone_emergencia ELSE NULL END as telefone_emergencia,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.nome_contato_emergencia ELSE NULL END as nome_contato_emergencia,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.tipo_sanguineo ELSE NULL END as tipo_sanguineo,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.genero ELSE NULL END as genero,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.data_nascimento ELSE NULL END as data_nascimento,
    f.fardamento,
    CASE WHEN public.can_view_sensitive_data(auth.uid(), f.empresa_id) THEN f.email_corporativo ELSE NULL END as email_corporativo
  FROM funcionarios f
  WHERE EXISTS (
    SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = f.empresa_id
  );
$function$;