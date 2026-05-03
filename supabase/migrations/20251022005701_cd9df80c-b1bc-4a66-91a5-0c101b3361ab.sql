-- Reanexar períodos existentes à férias correta com base na data de início do gozo
WITH candidatos AS (
  SELECT 
    p.id AS periodo_id,
    p.ferias_id AS ferias_atual,
    f_corr.id AS ferias_correta,
    f_corr.periodo_aquisitivo_inicio,
    COALESCE(f_corr.data_limite, (f_corr.periodo_aquisitivo_fim + INTERVAL '336 days'))::date AS limite
  FROM public.periodos_gozo_ferias p
  JOIN public.ferias f_atual ON f_atual.id = p.ferias_id
  JOIN public.ferias f_corr 
    ON f_corr.funcionario_id = f_atual.funcionario_id 
   AND f_corr.empresa_id = f_atual.empresa_id
  WHERE p.data_inicio::date >= f_corr.periodo_aquisitivo_inicio::date
    AND p.data_inicio::date <= COALESCE(f_corr.data_limite, (f_corr.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
    AND f_corr.id <> p.ferias_id
  ORDER BY p.id, f_corr.periodo_aquisitivo_inicio DESC
), escolha AS (
  SELECT DISTINCT ON (periodo_id) periodo_id, ferias_correta
  FROM candidatos
  ORDER BY periodo_id, periodo_aquisitivo_inicio DESC
)
UPDATE public.periodos_gozo_ferias p
SET ferias_id = e.ferias_correta
FROM escolha e
WHERE p.id = e.periodo_id;