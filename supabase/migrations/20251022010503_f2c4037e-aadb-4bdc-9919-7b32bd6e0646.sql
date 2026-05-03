-- 1. Remover férias duplicadas onde a empresa não corresponde à empresa atual do funcionário
DELETE FROM public.ferias f
WHERE EXISTS (
  SELECT 1 
  FROM public.funcionarios func
  WHERE func.id = f.funcionario_id
    AND func.empresa_id <> f.empresa_id
    AND NOT EXISTS (
      -- Manter se houver períodos de gozo cadastrados
      SELECT 1 FROM public.periodos_gozo_ferias p WHERE p.ferias_id = f.id
    )
);

-- 2. Criar índice único para evitar férias duplicadas no futuro
-- (mesmo funcionário, mesma empresa, mesmo período aquisitivo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ferias_unique_periodo 
ON public.ferias (funcionario_id, empresa_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim);