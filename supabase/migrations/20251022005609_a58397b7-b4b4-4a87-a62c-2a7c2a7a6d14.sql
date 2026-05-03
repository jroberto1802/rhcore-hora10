-- Desabilitar temporariamente o gatilho para permitir correção dos dados
DROP TRIGGER IF EXISTS trg_periodos_gozo_validate ON public.periodos_gozo_ferias;

-- 1) Identificar períodos mal vinculados e reanexá-los à férias correta do mesmo funcionário/empresa
WITH candidatos AS (
  SELECT 
    p.id AS periodo_id,
    p.ferias_id AS ferias_atual,
    f_corr.id AS ferias_correta,
    f_corr.periodo_aquisitivo_inicio,
    COALESCE(f_corr.data_limite, (f_corr.periodo_aquisitivo_fim + INTERVAL '336 days'))::date AS limite,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY f_corr.periodo_aquisitivo_inicio DESC) AS rn
  FROM public.periodos_gozo_ferias p
  JOIN public.ferias f_atual ON f_atual.id = p.ferias_id
  JOIN public.ferias f_corr 
    ON f_corr.funcionario_id = f_atual.funcionario_id 
   AND f_corr.empresa_id = f_atual.empresa_id
  WHERE p.data_inicio::date >= f_corr.periodo_aquisitivo_inicio::date
    AND p.data_inicio::date <= COALESCE(f_corr.data_limite, (f_corr.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
    AND p.data_fim::date <= COALESCE(f_corr.data_limite, (f_corr.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
    AND (
      p.ferias_id <> f_corr.id 
      OR p.data_fim::date > COALESCE(f_atual.data_limite, (f_atual.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
    )
)
UPDATE public.periodos_gozo_ferias p
SET ferias_id = c.ferias_correta
FROM candidatos c
WHERE p.id = c.periodo_id AND c.rn = 1;

-- 2) Deletar períodos órfãos (sem férias válida no intervalo)
DELETE FROM public.periodos_gozo_ferias p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ferias f
  WHERE f.id = p.ferias_id
    AND p.data_inicio::date >= f.periodo_aquisitivo_inicio::date
    AND p.data_inicio::date <= COALESCE(f.data_limite, (f.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
    AND p.data_fim::date <= COALESCE(f.data_limite, (f.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
);

-- 3) Recriar o gatilho de validação
CREATE TRIGGER trg_periodos_gozo_validate
BEFORE INSERT OR UPDATE ON public.periodos_gozo_ferias
FOR EACH ROW
EXECUTE FUNCTION public.periodos_gozo_validate_and_attach();